import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { code } = await request.json();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Store the calendar credentials
    const { error } = await supabase
      .from('calendar_credentials')
      .upsert({
        id: user.id,
        access_token: code,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Calendar credentials stored successfully' });
  } catch (error) {
    console.error('Error storing calendar credentials:', error);
    return NextResponse.json(
      { error: 'Failed to store calendar credentials' },
      { status: 500 }
    );
  }
}

// Add GET method to handle OAuth redirect
export async function GET(request: Request) {
  console.log('[Calendar Connect] Iniciando proceso de conexión...');
  
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    });
    
    // Await the session to fix the cookies warning
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('No se encontró sesión de usuario');
    }
    const user = session.user;

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('[Calendar Connect] Parámetros recibidos:', {
      code: code ? 'Sí' : 'No',
      error: error ? 'Sí' : 'No',
      errorDescription: errorDescription || 'No'
    });

    if (error) {
      console.error('[Calendar Connect] Error OAuth:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/dashboard/calendar?error=true&error_message=${encodeURIComponent(errorDescription || error)}`, 
        request.url)
      );
    }

    if (!code) {
      console.error('[Calendar Connect] No se proporcionó código');
      return NextResponse.redirect(
        new URL('/dashboard/calendar?error=true&error_message=No se proporcionó código de autorización', 
        request.url)
      );
    }

    // Create initial pending record
    const { error: initialError } = await supabase
      .from('calendar_credentials')
      .upsert({
        id: user.id,
        status: 'pending',
        updated_at: new Date().toISOString(),
      });

    if (initialError) {
      console.error('[Calendar Connect] Error al crear registro inicial:', initialError);
    }

    // If we have provider tokens, use those directly
    const provider_token = searchParams.get('provider_token');
    const provider_refresh_token = searchParams.get('provider_refresh_token');
    
    if (provider_token && provider_refresh_token) {
      console.log('[Calendar Connect] Usando tokens del proveedor...');
      
      const { error } = await supabase
        .from('calendar_credentials')
        .upsert({
          id: user.id,
          access_token: provider_token,
          refresh_token: provider_refresh_token,
          status: 'connected',
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[Calendar Connect] Error al guardar credenciales:', error);
        throw error;
      }

      console.log('[Calendar Connect] Credenciales guardadas exitosamente');
      return NextResponse.redirect(new URL('/dashboard/calendar?connected=true', request.url));
    }

    // If no provider tokens, exchange the code
    console.log('[Calendar Connect] Intercambiando código por tokens...');
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/connect`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    console.log('[Calendar Connect] Respuesta de tokens recibida');

    if (!tokenResponse.ok) {
      console.error('[Calendar Connect] Error en respuesta de tokens:', tokens);
      await supabase
        .from('calendar_credentials')
        .update({ 
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      throw new Error(tokens.error_description || 'Error al intercambiar código por tokens');
    }

    console.log('[Calendar Connect] Guardando credenciales finales...');
    await supabase
      .from('calendar_credentials')
      .upsert({
        id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        status: 'connected',
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[Calendar Connect] Error al guardar credenciales finales:', error);
      throw error;
    }

    console.log('[Calendar Connect] Proceso completado exitosamente');
    return NextResponse.redirect(new URL('/dashboard/calendar?connected=true', request.url));
  } catch (error) {
    console.error('[Calendar Connect] Error en el proceso:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.redirect(
      new URL(`/dashboard/calendar?error=true&error_message=${encodeURIComponent(errorMessage)}`, 
      request.url)
    );
  }
} 