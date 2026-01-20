'use server';

import { createServerComponentClient } from '@/lib/supabase/server';

export async function requestRegistration(
    email: string,
    condominiumCode: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createServerComponentClient();

        // Find condominium by unique code
        const { data: condominium, error: condoError } = await supabase
            .from('condominiums')
            .select('id, name')
            .eq('unique_code', condominiumCode.toUpperCase())
            .single();

        if (condoError || !condominium) {
            return { success: false, error: 'Código de condominio no válido' };
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return { success: false, error: 'Este email ya está registrado. Por favor inicia sesión.' };
        }

        // Check if there's already a pending registration
        const { data: existingPending } = await supabase
            .from('pending_registrations')
            .select('id, status')
            .eq('email', email)
            .eq('condominium_id', condominium.id)
            .single();

        if (existingPending) {
            if (existingPending.status === 'pending') {
                return { success: false, error: 'Ya tienes una solicitud pendiente. Espera la aprobación del administrador.' };
            } else if (existingPending.status === 'rejected') {
                // Allow re-registration after rejection
                await supabase
                    .from('pending_registrations')
                    .delete()
                    .eq('id', existingPending.id);
            }
        }

        // Create pending registration
        const { error: insertError } = await supabase
            .from('pending_registrations')
            .insert({
                condominium_id: condominium.id,
                email: email.toLowerCase(),
                status: 'pending',
            });

        if (insertError) {
            console.error('Error creating pending registration:', insertError);
            return { success: false, error: 'Error al crear solicitud. Intenta nuevamente.' };
        }

        // TODO: Send notification email to admin about new registration request

        return { success: true };
    } catch (error) {
        console.error('Error in requestRegistration:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}
