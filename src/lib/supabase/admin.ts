import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

/**
 * Creates a Supabase client with admin/service role privileges.
 * ONLY use this for server-side operations that require elevated permissions:
 * - Sending user invitation emails via auth.admin.inviteUserByEmail()
 * - Managing user accounts
 * - Bypassing RLS for administrative operations
 * 
 * WARNING: Never expose the service role key to the client!
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
    }

    if (!serviceRoleKey) {
        console.warn('SUPABASE_SERVICE_ROLE_KEY is not set - email invitations will not work');
        // Return null or throw depending on requirements
        return null;
    }

    return createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
