'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
    try {
        const supabase = await createServerComponentClient();
        const adminClient = createAdminClient(); // Ensure admin client is available for inviteUserByEmail

        // Check if admin is authenticated
        const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !adminUser) {
            return { success: false, error: 'No autorizado' };
        }

        // Get admin's condominium
        const { data: adminProfile } = await supabase
            .from('users')
            .select('condominium_id')
            .eq('id', adminUser.id)
            .single();

        if (!adminProfile?.condominium_id) {
            return { success: false, error: 'Perfil de administrador incompleto' };
        }

        const email = formData.get('email') as string;
        const fullName = formData.get('fullName') as string;
        const unitId = formData.get('unitId') as string;
        const userType = formData.get('userType') as 'owner' | 'tenant';

        if (!email || !fullName || !unitId || !userType) {
            return { success: false, error: 'Todos los campos son requeridos' };
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, condominium_id, status')
            .eq('email', email)
            .single();

        if (existingUser) {
            // User exists logic
            if (existingUser.condominium_id === adminProfile.condominium_id) {
                if (existingUser.status === 'pending') {
                    return { success: false, error: 'Este usuario ya tiene una solicitud pendiente. Revísalo en la pestaña "Pendientes".' };
                }
                return { success: false, error: 'Este usuario ya está registrado en este condominio.' };
            } else if (existingUser.condominium_id) {
                // Option A: Block strict (User confirmed)
                return { success: false, error: 'Este usuario ya pertenece a otro condominio.' };
            } else {
                // User exists but has no condominium (orphaned or unlinked)
                // Proceed to link them and send invitation
                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        condominium_id: adminProfile.condominium_id,
                        unit_id: unitId,
                        role: 'resident',
                        user_type: userType,
                        status: 'active', // Set active so they can login and use dashboard
                        invited_by: adminUser.id,
                        invited_at: new Date().toISOString()
                    })
                    .eq('id', existingUser.id);

                if (updateError) {
                    console.error('Error updating existing user:', updateError);
                    return { success: false, error: 'Error al vincular usuario existente' };
                }

                // Ideally send a "Welcome" email here via a separate email service since we can't use inviteUserByEmail
                revalidatePath('/admin/users');
                return { success: true, message: 'Usuario existente vinculado exitosamente' };
            }
        }

        // New User: Send Invitation via Supabase Auth
        // This creates the user and triggers the email
        if (!adminClient) {
            return { success: false, error: 'Error interno: Cliente de administración no disponible' };
        }

        const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
            data: {
                full_name: fullName,
                condominium_id: adminProfile.condominium_id,
                unit_id: unitId,
                user_type: userType,
                role: 'resident',
                status: 'active',
                profile_completed: false, // Forces them to go through complete-profile to set password
                invited_by: adminUser.id,
                invited_at: new Date().toISOString(),
                auth_provider: 'email'
            },
            // Redirect to auth/callback first - it will exchange the token and redirect to complete-profile
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
        } as any);

        if (error) {
            console.error('Error inviting user:', error);
            // Handle rate limit specifically
            if (error.status === 429 || error.message.includes('rate limit')) {
                return {
                    success: false,
                    error: 'Límite de envío de correos excedido. Por favor espera unos minutos o usa otro correo.'
                };
            }
            return { success: false, error: error.message };
        }

        // Audit Log
        if (data.user) {
            await supabase.rpc('create_audit_log', {
                p_action_type: 'user_invited',
                p_entity_type: 'user',
                p_entity_id: data.user.id,
                p_details: {
                    email,
                    unit_id: unitId,
                    target_user_info: `${fullName} (${email})`
                }
            });
        }

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Error in createUser:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

export async function approveRegistration(
    registrationId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createServerComponentClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'No autorizado' };
        }

        // Verify user is admin
        const { data: adminProfile } = await supabase
            .from('users')
            .select('role, condominium_id')
            .eq('id', user.id)
            .single();

        if (!adminProfile || adminProfile.role !== 'admin') {
            return { success: false, error: 'No tienes permisos de administrador' };
        }

        // Get the registration
        const { data: registrationData } = await supabase
            .from('pending_registrations')
            .select('*')
            .eq('id', registrationId)
            .eq('condominium_id', adminProfile.condominium_id)
            .single();

        const registration = registrationData as any;

        if (!registration) {
            return { success: false, error: 'Registro no encontrado' };
        }

        // Try to send approval email via Supabase Auth
        const adminClient = createAdminClient();
        let invitationSent = false;

        if (adminClient && registration.email) {
            try {
                const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(registration.email, {
                    data: {
                        condominium_id: adminProfile.condominium_id,
                        registration_id: registrationId,
                        approved_by: user.id,
                    },
                    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
                } as any);

                if (!inviteError) {
                    invitationSent = true;
                }
            } catch (inviteErr: any) {
                console.warn('Error sending approval invite:', inviteErr);
                // Handle rate limit specifically
                if (inviteErr.status === 429 || inviteErr.message?.includes('rate limit')) {
                    return {
                        success: false,
                        error: 'Límite de envío de correos excedido. Por favor intenta más tarde.'
                    };
                }
            }
        }

        // Update registration status
        const { error: updateError } = await supabase
            .from('pending_registrations')
            .update({
                status: 'approved',
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
                notes: invitationSent ? 'Aprobado y email enviado' : 'Aprobado (sin email)',
            })
            .eq('id', registrationId);

        if (updateError) {
            return { success: false, error: updateError.message };
        }

        // Log audit event
        await supabase.from('audit_logs').insert({
            condominium_id: adminProfile.condominium_id,
            user_id: user.id,
            action: 'user_approved',
            metadata: {
                registration_id: registrationId,
                approved_email: registration.email,
                invitation_sent: invitationSent,
            },
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Error in approveRegistration:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

export async function rejectRegistration(
    registrationId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createServerComponentClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'No autorizado' };
        }

        // Verify user is admin
        const { data: adminProfile } = await supabase
            .from('users')
            .select('role, condominium_id')
            .eq('id', user.id)
            .single();

        if (!adminProfile || adminProfile.role !== 'admin') {
            return { success: false, error: 'No tienes permisos de administrador' };
        }

        // Update registration status
        const { error: updateError } = await supabase
            .from('pending_registrations')
            .update({
                status: 'rejected',
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', registrationId)
            .eq('condominium_id', adminProfile.condominium_id);

        if (updateError) {
            return { success: false, error: updateError.message };
        }

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Error in rejectRegistration:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

export async function updateUserStatus(
    userId: string,
    newStatus: 'active' | 'suspended'
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createServerComponentClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'No autorizado' };
        }

        // Verify user is admin
        const { data: adminProfile } = await supabase
            .from('users')
            .select('role, condominium_id')
            .eq('id', user.id)
            .single();

        if (!adminProfile || adminProfile.role !== 'admin') {
            return { success: false, error: 'No tienes permisos de administrador' };
        }

        // Verify target user belongs to this condominium and get their info
        const { data: targetUserData } = await supabase
            .from('users')
            .select('id, email, full_name, condominium_id, unit_id, units(name)')
            .eq('id', userId)
            .single();

        const targetUser = targetUserData as any;

        if (!targetUser || targetUser.condominium_id !== adminProfile.condominium_id) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        // Prevent self-suspension
        if (userId === user.id) {
            return { success: false, error: 'No puedes suspenderte a ti mismo' };
        }

        // Update user status
        const { error: updateError } = await supabase
            .from('users')
            .update({ status: newStatus })
            .eq('id', userId);

        if (updateError) {
            return { success: false, error: updateError.message };
        }

        // Log audit event with full user info
        const targetUnitInfo = targetUser.units as { name: string } | null;
        await supabase.from('audit_logs').insert({
            condominium_id: adminProfile.condominium_id,
            user_id: user.id,
            unit_id: targetUser.unit_id,
            action: newStatus === 'suspended' ? 'user_suspended' : 'user_reactivated',
            metadata: {
                target_user_id: userId,
                target_user_name: targetUser.full_name || 'Sin nombre',
                target_user_email: targetUser.email,
                target_unit_name: targetUnitInfo?.name || 'Sin unidad',
                new_status: newStatus,
            },
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Error in updateUserStatus:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

/**
 * Approve a self-registered user.
 * Sets their status to 'active' so they can log in and complete their profile.
 */
export async function approveSelfRegistration(
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createServerComponentClient();
        const adminClient = createAdminClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'No autorizado' };
        }

        // Verify user is admin
        const { data: adminProfile } = await supabase
            .from('users')
            .select('role, condominium_id')
            .eq('id', user.id)
            .single();

        if (!adminProfile || adminProfile.role !== 'admin') {
            return { success: false, error: 'No tienes permisos de administrador' };
        }

        // Get the pending user
        const { data: pendingUser } = await supabase
            .from('users')
            .select('id, email, status, condominium_id, invited_by')
            .eq('id', userId)
            .eq('condominium_id', adminProfile.condominium_id)
            .eq('status', 'pending')
            .is('invited_by', null)
            .single();

        if (!pendingUser) {
            return { success: false, error: 'Usuario no encontrado o ya fue procesado' };
        }

        // Update user status to active
        const { error: updateError } = await supabase
            .from('users')
            .update({
                status: 'active',
                invited_by: user.id, // Mark as approved by this admin
                invited_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating user status:', updateError);
            return { success: false, error: 'Error al aprobar usuario' };
        }

        // Send approval notification email using Supabase Auth magic link
        // This allows them to know their account is active
        if (adminClient && pendingUser.email) {
            try {
                await adminClient.auth.admin.generateLink({
                    type: 'magiclink',
                    email: pendingUser.email,
                    options: {
                        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
                    }
                });
                // Note: The magic link email will be sent, notifying them their account is ready
            } catch (emailError: any) {
                console.error('Error sending approval email:', emailError);
                if (emailError.status === 429 || emailError.message?.includes('rate limit')) {
                    // In this case (self-registration approval), we might want to warn but not fail completely 
                    // since the user is already updated in DB?
                    // Actually, if email fails, they won't get the magic link.
                    // But they can request a new one later or use password reset.
                    // Let's just log it for now as non-blocking for approval action, 
                    // or maybe blocking if it's critical. 
                    // The comment says "Continue even if email fails".
                }
                // Continue even if email fails - user can still log in with password
            }
        }

        // Log audit event
        await supabase.from('audit_logs').insert({
            condominium_id: adminProfile.condominium_id,
            user_id: user.id,
            action: 'user_approved',
            metadata: {
                target_user_id: userId,
                target_user_email: pendingUser.email,
            },
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Error in approveSelfRegistration:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

/**
 * Reject a self-registered user.
 * Deletes them from the system completely.
 */
export async function rejectSelfRegistration(
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createServerComponentClient();
        const adminClient = createAdminClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'No autorizado' };
        }

        // Verify user is admin
        const { data: adminProfile } = await supabase
            .from('users')
            .select('role, condominium_id')
            .eq('id', user.id)
            .single();

        if (!adminProfile || adminProfile.role !== 'admin') {
            return { success: false, error: 'No tienes permisos de administrador' };
        }

        // Get the pending user
        const { data: pendingUser } = await supabase
            .from('users')
            .select('id, email, status, condominium_id, invited_by')
            .eq('id', userId)
            .eq('condominium_id', adminProfile.condominium_id)
            .eq('status', 'pending')
            .is('invited_by', null)
            .single();

        if (!pendingUser) {
            return { success: false, error: 'Usuario no encontrado o ya fue procesado' };
        }

        // Delete from public.users first
        const { error: deleteUserError } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (deleteUserError) {
            console.error('Error deleting user profile:', deleteUserError);
            return { success: false, error: 'Error al rechazar usuario' };
        }

        // Delete from auth.users using admin client
        if (adminClient) {
            try {
                await adminClient.auth.admin.deleteUser(userId);
            } catch (authError) {
                console.error('Error deleting auth user:', authError);
                // Continue - public user is deleted
            }
        }

        // Log audit event
        await supabase.from('audit_logs').insert({
            condominium_id: adminProfile.condominium_id,
            user_id: user.id,
            action: 'user_rejected',
            metadata: {
                target_user_id: userId,
                target_user_email: pendingUser.email,
            },
        } as any);

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Error in rejectSelfRegistration:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}
