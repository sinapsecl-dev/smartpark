'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function linkCondominium(
    condominiumCode: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createServerComponentClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'No autorizado' };
        }

        // Find condominium by unique code
        const { data: condominium, error: condoError } = await supabase
            .from('condominiums')
            .select('id')
            .eq('unique_code', condominiumCode.toUpperCase())
            .single();

        if (condoError || !condominium) {
            return { success: false, error: 'Código de condominio no válido o no existe' };
        }

        // Check if user is already linked to a condominium
        const { data: existingProfile } = await supabase
            .from('users')
            .select('condominium_id')
            .eq('id', user.id)
            .single();

        if (existingProfile?.condominium_id) {
            if (existingProfile.condominium_id === condominium.id) {
                return { success: true }; // Already linked to this one
            }
            return { success: false, error: 'Tu cuenta ya está vinculada a otro condominio.' };
        }

        // Link user to condominium
        const { error: updateError } = await supabase
            .from('users')
            .upsert({
                id: user.id,
                email: user.email!,
                condominium_id: condominium.id,
                role: 'resident',
                // This implies Code = Approval.
                // So I should probably set status = 'active' if code is valid.
                status: 'active',
                auth_provider: 'google', // Likely Google if they are here
                profile_completed: false,
                updated_at: new Date().toISOString()
            });

        if (updateError) {
            console.error('Error linking condominium:', updateError);
            return { success: false, error: 'Error al vincular cuenta' };
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error in linkCondominium:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}
