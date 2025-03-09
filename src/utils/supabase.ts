import { createClient } from '@supabase/supabase-js';

export type Agent = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  profile_image_url?: string;
  specialization?: string;
  bio?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 