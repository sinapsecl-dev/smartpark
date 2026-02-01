import { createServerClient } from '@supabase/ssr';
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

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    try {
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Error during Supabase session exchange:', error);
        return NextResponse.redirect(requestUrl.origin + '/login?error=auth_failed');
      }

      if (session?.user) {
        // Check if user has a profile and their status
        const { data: profileData } = await supabase
          .from('users')
          .select('profile_completed, role, condominium_id, status')
          .eq('id', session.user.id as any)
          .single();

        const userProfile = profileData as any;

        // If user has no condominium linked, redirect to onboarding
        if (!userProfile || !userProfile.condominium_id) {
          return NextResponse.redirect(requestUrl.origin + '/onboarding');
        }

        // BLOCK PENDING USERS - they must wait for admin approval
        if (userProfile.status === 'pending') {
          // Sign them out and redirect to login with message
          await supabase.auth.signOut();
          return NextResponse.redirect(requestUrl.origin + '/login?error=pending_approval');
        }

        // If user is suspended, block access
        if (userProfile.status === 'suspended') {
          await supabase.auth.signOut();
          return NextResponse.redirect(requestUrl.origin + '/login?error=suspended');
        }

        // If user hasn't completed their profile, redirect to complete-profile
        if (!userProfile.profile_completed) {
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
