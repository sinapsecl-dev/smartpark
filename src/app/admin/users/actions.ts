'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function createUser(
    email: string,
    unitId: string
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

        // Verify unit belongs to this condominium
        const { data: unit } = await supabase
            .from('units')
            .select('id, name, condominium_id')
            .eq('id', unitId)
            .single();

        if (!unit || unit.condominium_id !== adminProfile.condominium_id) {
            return { success: false, error: 'Unidad no válida' };
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return { success: false, error: 'Este email ya está registrado' };
        }

        // Check for pending registration
        const { data: existingPending } = await supabase
            .from('pending_registrations')
            .select('id')
            .eq('email', email)
            .eq('condominium_id', adminProfile.condominium_id)
            .single();

        if (existingPending) {
            return { success: false, error: 'Ya existe una invitación pendiente para este email' };
        }

        // Try to send invitation via Supabase Auth
        const adminClient = createAdminClient();
        let invitationSent = false;

        if (adminClient) {
            try {
                const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
                    data: {
                        condominium_id: adminProfile.condominium_id,
                        unit_id: unitId,
                        unit_name: unit.name,
                        invited_by: user.id,
                    },
                    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/complete-profile`,
                });

                if (!inviteError) {
                    invitationSent = true;
                } else {
                    console.warn('Supabase invite error (will fallback to pending registration):', inviteError);
                }
            } catch (inviteErr) {
                console.warn('Error sending Supabase invite:', inviteErr);
            }
        }

        // Create pending registration record (even if invitation was sent, for tracking)
        const { error: pendingError } = await supabase
            .from('pending_registrations')
            .insert({
                condominium_id: adminProfile.condominium_id,
                email: email,
                status: 'approved', // Pre-approved since admin created it
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
                notes: invitationSent
                    ? `Invitación enviada por email. Unidad: ${unit.name}`
                    : `Creado por admin (sin email). Unidad: ${unit.name}`,
            });

        if (pendingError) {
            console.error('Error creating pending registration:', pendingError);
            return { success: false, error: pendingError.message };
        }

        // Log audit event
        await supabase.from('audit_logs').insert({
            condominium_id: adminProfile.condominium_id,
            user_id: user.id,
            unit_id: unitId,
            action: 'user_created',
            metadata: {
                invited_email: email,
                invited_by_admin: true,
                invitation_email_sent: invitationSent,
            },
        });

        revalidatePath('/admin/users');
        return {
            success: true,
            error: invitationSent ? undefined : 'Usuario creado (email no enviado - configura SUPABASE_SERVICE_ROLE_KEY)'
        };
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
        const { data: registration } = await supabase
            .from('pending_registrations')
            .select('*')
            .eq('id', registrationId)
            .eq('condominium_id', adminProfile.condominium_id)
            .single();

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
                    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/complete-profile`,
                });

                if (!inviteError) {
                    invitationSent = true;
                }
            } catch (inviteErr) {
                console.warn('Error sending approval invite:', inviteErr);
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

        // Verify target user belongs to this condominium
        const { data: targetUser } = await supabase
            .from('users')
            .select('id, condominium_id')
            .eq('id', userId)
            .single();

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

        // Log audit event
        await supabase.from('audit_logs').insert({
            condominium_id: adminProfile.condominium_id,
            user_id: user.id,
            action: newStatus === 'suspended' ? 'user_suspended' : 'user_approved',
            metadata: { target_user_id: userId, new_status: newStatus },
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Error in updateUserStatus:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}
