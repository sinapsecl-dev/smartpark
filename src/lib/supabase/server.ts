import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase'; // Import the generated types

export async function createServerComponentClient() {
  const cookieStore = await cookies();

  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!supabaseJwtSecret) {
    console.error('ERROR: SUPABASE_JWT_SECRET is not set in createServerComponentClient.');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL is not set in createServerComponentClient.');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in createServerComponentClient.');
  }


  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
      supabase: {
        jwtSecret: supabaseJwtSecret || 'dummy-secret-for-debug',
      }
    } as any
  );

  return supabase;
}
