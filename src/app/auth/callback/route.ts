import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || requestUrl.searchParams.get('redirect_to');

  // Basic check for environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Environment variable NEXT_PUBLIC_SUPABASE_URL is not set.');
    return NextResponse.json({ error: 'Supabase URL not configured.' }, { status: 500 });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.');
    return NextResponse.json({ error: 'Supabase Anon Key not configured.' }, { status: 500 });
  }

  if (code) {
    const cookieStore = await cookies();
    const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
        supabase: {
          jwtSecret: supabaseJwtSecret,
        },
      } as any
    );

    try {
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Error during Supabase session exchange:', error);
        return NextResponse.redirect(requestUrl.origin + '/login?error=auth_failed');
      }

      if (session?.user) {
        // Check if user has completed their profile
        const { data: userProfile } = await supabase
          .from('users')
          .select('profile_completed, role')
          .eq('id', session.user.id)
          .single();

        // If user doesn't have a profile or hasn't completed it, redirect to complete-profile
        if (!userProfile || !userProfile.profile_completed) {
          return NextResponse.redirect(requestUrl.origin + '/complete-profile');
        }

        // Redirect based on role
        if (userProfile.role === 'admin') {
          return NextResponse.redirect(requestUrl.origin + '/admin');
        }
      }
    } catch (error) {
      console.error('Error during Supabase session exchange:', error);
      return NextResponse.redirect(requestUrl.origin + '/login?error=auth_failed');
    }
  }

  // Use the next parameter if provided, otherwise go to dashboard
  const redirectTo = next ? requestUrl.origin + next : requestUrl.origin + '/dashboard';
  return NextResponse.redirect(redirectTo);
}
