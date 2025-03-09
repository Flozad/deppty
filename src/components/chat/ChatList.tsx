import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { ChatSession } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function ChatList({ onSelectSession }: { onSelectSession: (session: ChatSession) => void }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchSessions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First fetch the sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('conversation_sessions')
        .select(`
          *,
          client:clients(
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('active', true)
        .order('last_message_at', { ascending: false });

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
        return;
      }

      // Then fetch the latest message for each session
      const sessionsWithMessages = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (messagesError) {
            console.error('Error fetching messages:', messagesError);
            return session;
          }

          return {
            ...session,
            messages: messages || []
          };
        })
      );

      setSessions(sessionsWithMessages);
      setLoading(false);
    };

    fetchSessions();

    // Subscribe to new sessions and messages
    const sessionsSubscription = supabase
      .channel('chat_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_sessions'
      }, () => {
        fetchSessions();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => {
      sessionsSubscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) {
    return <div className="p-4 text-gray-400">Loading conversations...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        No active conversations
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-700">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSelectSession(session)}
          className="w-full p-4 hover:bg-gray-800 transition-colors text-left flex items-start space-x-4"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {session.client?.first_name} {session.client?.last_name}
            </p>
            <p className="text-sm text-gray-400 truncate">
              {session.messages?.[0]?.content || 'No messages'}
            </p>
          </div>
          <div className="text-xs text-gray-500">
            {session.last_message_at && 
              formatDistanceToNow(new Date(session.last_message_at), {
                addSuffix: true,
                locale: es
              })
            }
          </div>
        </button>
      ))}
    </div>
  );
} 