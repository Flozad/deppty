'use client';

import { useState } from 'react';
import { ChatList } from '@/components/chat/ChatList';
import { ChatMessages } from '@/components/chat/ChatMessages';
import type { ChatSession } from '@/types/chat';

export default function ChatPage() {
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex">
      {/* Chat List Sidebar */}
      <div className="w-80 border-r border-gray-700 bg-gray-900 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ChatList onSelectSession={setSelectedSession} />
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 bg-gray-900">
        {selectedSession ? (
          <ChatMessages session={selectedSession} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
} 