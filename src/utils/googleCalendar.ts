import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function getGoogleCalendarClient(userId: string) {
  // Fetch credentials from Supabase
  const { data: credentials, error } = await supabase
    .from('calendar_credentials')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !credentials) {
    throw new Error('No calendar credentials found');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_SITE_URL + '/auth/callback'
  );

  oauth2Client.setCredentials({
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token,
    expiry_date: new Date(credentials.expires_at).getTime(),
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    const updates: Record<string, unknown> = {};
    if (tokens.access_token) {
      updates.access_token = tokens.access_token;
    }
    if (tokens.refresh_token) {
      updates.refresh_token = tokens.refresh_token;
    }
    if (tokens.expiry_date) {
      updates.expires_at = new Date(tokens.expiry_date).toISOString();
    }

    await supabase
      .from('calendar_credentials')
      .update(updates)
      .eq('id', userId);
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
} 