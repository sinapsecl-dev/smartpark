'use server';

import { createServerComponentClient } from '@/lib/supabase/server';

export async function checkUserProvider(email: string): Promise<{ auth_provider: string | null }> {
    try {
        const supabase = await createServerComponentClient();

        // Supabase Auth doesn't expose provider easily via client SDK unless we check public.users
        // Assuming we kept public.users in sync
        const { data } = await supabase
            .from('users')
            .select('auth_provider')
            .eq('email', email)
            .single();

        return { auth_provider: (data as any)?.auth_provider || null };
    } catch {
        return { auth_provider: null };
    }
}

export async function sendResetLink(email: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createServerComponentClient();

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/update-password`,
        });

        if (error) {
            // Rate limit or other error
            console.error('Reset password error:', error);
            // Don't reveal too much info if user doesn't exist (security practice), but for now return generic
            return { success: false, error: 'Error al enviar correo. Intenta nuevamente más tarde.' };
        }

        return { success: true };
    } catch (error) {
        console.error('Error in sendResetLink:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}
