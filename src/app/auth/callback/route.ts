import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const provider_token = requestUrl.searchParams.get('provider_token')
    const provider_refresh_token = requestUrl.searchParams.get('provider_refresh_token')

    if (code) {
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
      
      // Exchange the code for a session
      const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error('[Auth Callback] Error de sesión:', sessionError)
        return NextResponse.redirect(new URL('/login', request.url))
      }

      if (session && provider_token && provider_refresh_token) {
        console.log('[Auth Callback] Guardando credenciales del calendario...')
        // Store the Google Calendar credentials
        const { error: credentialsError } = await supabase
          .from('calendar_credentials')
          .upsert({
            id: session.user.id,
            access_token: provider_token,
            refresh_token: provider_refresh_token,
            updated_at: new Date().toISOString(),
          })

        if (credentialsError) {
          console.error('[Auth Callback] Error al guardar credenciales:', credentialsError)
        } else {
          console.log('[Auth Callback] Credenciales guardadas exitosamente')
        }
      }

      // Redirect to dashboard after successful authentication
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // If no code, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  } catch (error) {
    console.error('[Auth Callback] Error inesperado:', error)
    return NextResponse.redirect(new URL('/login?error=true', request.url))
  }
} 