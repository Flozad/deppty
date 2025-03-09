'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function ConnectCalendar() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClientComponentClient();

  const checkCalendarConnection = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_credentials')
        .select('*')
        .single();

      if (error) throw error;
      setIsConnected(!!data);
    } catch (error) {
      console.error('[ConnectCalendar] Error checking connection:', error);
      setIsConnected(false);
    }
  }, [supabase]);

  useEffect(() => {
    checkCalendarConnection();
  }, [checkCalendarConnection]);

  const handleConnect = async () => {
    try {
      setLoading(true);
      console.log('[ConnectCalendar] Iniciando proceso de conexión con Google Calendar...');
      
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard/calendar`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
            include_granted_scopes: 'true'
          }
        }
      });

      if (signInError) throw signInError;
      
      // The redirect will happen automatically
    } catch (error) {
      console.error('[ConnectCalendar] Error:', error);
      setError(error instanceof Error ? error.message : 'Error al conectar con Google Calendar');
      setLoading(false);
    }
  };

  return (
    <div className="text-center text-white">
      <p className="mb-4">
        {isConnected 
          ? 'Google Calendar está conectado'
          : 'Conecta tu Google Calendar para sincronizar las visitas (opcional)'
        }
      </p>
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
          {error}
        </div>
      )}
      <button
        onClick={handleConnect}
        disabled={loading || isConnected}
        className="relative w-full max-w-sm rounded-lg bg-white py-3 px-4 text-black hover:bg-gray-100 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
      >
        <div className="flex items-center justify-center gap-3">
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
          ) : (
            <>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="font-medium">
                {isConnected ? 'Conectado' : 'Conectar con Google Calendar'}
              </span>
            </>
          )}
        </div>
      </button>
    </div>
  );
} 