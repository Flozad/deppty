export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface Message {
  id: string;
  client_id: string;
  agent_id: string | null;
  direction: 'incoming' | 'outgoing';
  channel: string;
  content: string;
  media_urls?: Record<string, unknown>[] | null;
  intent?: string | null;
  processed?: boolean;
  read?: boolean;
  external_id?: string | null;
  created_at: string;
  session_id: string | null;
  message?: Record<string, unknown> | null;
}

export interface ChatSession {
  id: string;
  client_id: string;
  client?: Client;
  context?: Record<string, unknown> | null;
  active: boolean;
  last_message_at: string;
  created_at: string;
  messages?: Message[];
} 