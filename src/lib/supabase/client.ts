'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Singleton pattern to ensure only one Supabase client instance exists
let supabaseClient: SupabaseClient<Database> | null = null;

export function createClientComponentClient(): SupabaseClient<Database> {
  // Return existing instance if already created (singleton)
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key are required!');
  }

  // Create and cache the client
  supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  return supabaseClient;
}

// Export a getter for the singleton instance (useful for subscriptions)
export function getSupabaseClient(): SupabaseClient<Database> {
  return createClientComponentClient();
}