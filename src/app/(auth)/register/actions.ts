'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function requestRegistration(
    email: string,
    password?: string,
    condominiumCode?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
        const supabase = await createServerComponentClient();
        const adminClient = createAdminClient();

        if (!adminClient) {
            console.error('Admin client not available - SUPABASE_SERVICE_ROLE_KEY missing');
            return { success: false, error: 'Error de configuración del servidor' };
        }

        if (!condominiumCode) {
            return { success: false, error: 'Código de condominio es requerido' };
        }

        if (!password || password.length < 6) {
            return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
        }

        const normalizedCode = condominiumCode.toUpperCase().trim();

        // Find condominium by unique code (use admin client to bypass RLS)
        const { data: condominium, error: condoError } = await adminClient
            .from('condominiums')
            .select('id, name')
            .eq('unique_code', normalizedCode)
            .single();

        if (condoError || !condominium) {
            return { success: false, error: 'Código de condominio no válido' };
        }

        const condoId = condominium.id;
        const condoName = condominium.name;

        // Check if user already exists in public.users (use admin client)
        const { data: existingUser } = await adminClient
            .from('users')
            .select('id, status, email')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            if (existingUser.status === 'pending') {
                return {
                    success: false,
                    error: 'Ya existe una solicitud pendiente para este email. Espera la aprobación del administrador.'
                };
            }
            return { success: false, error: 'Este email ya está registrado. Por favor inicia sesión.' };
        }

        // Create auth user WITHOUT email confirmation
        // Using admin.createUser instead of signUp to bypass email confirmation
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email: email.toLowerCase(),
            password: password,
            email_confirm: true, // Auto-confirm email so they can login when approved
            user_metadata: {
                condominium_id: condoId,
                role: 'resident',
            }
        });

        if (authError) {
            console.error('Supabase Auth Error:', authError);
            if (authError.message.includes('already registered')) {
                return { success: false, error: 'Este email ya está registrado. Por favor inicia sesión.' };
            }
            return { success: false, error: authError.message };
        }

        if (authData.user) {
            // Create user profile in public.users with 'pending' status
            // invited_by = NULL indicates self-registration
            const { error: profileError } = await adminClient
                .from('users')
                .insert({
                    id: authData.user.id,
                    email: email.toLowerCase(),
                    condominium_id: condoId,
                    role: 'resident',
                    status: 'pending', // User needs admin approval
                    profile_completed: false,
                    auth_provider: 'email',
                    invited_by: null, // NULL = self-registered (not invited by admin)
                });

            if (profileError) {
                // If trigger already created it, update it
                if (profileError.code === '23505') { // Unique violation
                    await adminClient
                        .from('users')
                        .update({
                            condominium_id: condoId,
                            status: 'pending',
                            auth_provider: 'email',
                            invited_by: null,
                        })
                        .eq('id', authData.user.id);
                } else {
                    console.error('Error creating profile:', profileError);
                    // Try to clean up the auth user
                    await adminClient.auth.admin.deleteUser(authData.user.id);
                    return { success: false, error: 'Error al crear perfil de usuario' };
                }
            }
        }

        return {
            success: true,
            message: `Tu solicitud ha sido enviada. El administrador de ${condoName} revisará tu solicitud y te notificaremos por correo electrónico cuando sea aprobada.`
        };
    } catch (error) {
        console.error('Error in requestRegistration:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}
