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
  media_urls?: any[];
  created_at: string;
  session_id: string;
}

export interface ChatSession {
  id: string;
  client_id: string;
  client?: Client;
  context?: any;
  active: boolean;
  last_message_at: string;
  created_at: string;
  messages?: Message[];
} 