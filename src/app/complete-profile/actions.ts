'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface CompleteProfileData {
    userId: string;
    fullName: string;
    phone: string | null;
    userType: 'owner' | 'tenant';
    unitId: string;
    condominiumId: string;
    password?: string;
}

export async function completeProfile(
    data: CompleteProfileData
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createServerComponentClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== data.userId) {
            return { success: false, error: 'No autorizado' };
        }

        // Set password if provided
        if (data.password) {
            const { error: passwordError } = await supabase.auth.updateUser({
                password: data.password
            });

            if (passwordError) {
                console.error('Error setting password:', passwordError);
                return { success: false, error: 'Error al establecer la contraseña: ' + passwordError.message };
            }
        }

        // Verify unit belongs to condominium
        const { data: unit } = await supabase
            .from('units')
            .select('id, condominium_id')
            .eq('id', data.unitId)
            .eq('condominium_id', data.condominiumId)
            .single();

        if (!unit) {
            return { success: false, error: 'Unidad no válida' };
        }

        // Check if user profile already exists
        const { data: existingProfile } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.userId)
            .single();

        if (existingProfile) {
            // Update existing profile
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    full_name: data.fullName,
                    phone: data.phone,
                    user_type: data.userType,
                    unit_id: data.unitId,
                    profile_completed: true,
                    status: 'active',
                    auth_provider: data.password ? 'email' : undefined,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', data.userId);

            if (updateError) {
                console.error('Error updating profile:', updateError);
                return { success: false, error: updateError.message };
            }
        } else {
            // Create new profile
            const { error: insertError } = await supabase
                .from('users')
                .insert({
                    id: data.userId,
                    email: user.email!,
                    full_name: data.fullName,
                    phone: data.phone,
                    user_type: data.userType,
                    unit_id: data.unitId,
                    condominium_id: data.condominiumId,
                    role: 'resident',
                    status: 'active',
                    auth_provider: data.password ? 'email' : 'google', // Default to google if no password (assumes OAuth)
                    profile_completed: true,
                });

            if (insertError) {
                console.error('Error creating profile:', insertError);
                return { success: false, error: insertError.message };
            }
        }

        // Log audit event
        await supabase.from('audit_logs').insert({
            condominium_id: data.condominiumId,
            user_id: data.userId,
            unit_id: data.unitId,
            action: 'user_approved',
            metadata: { profile_completed: true, user_type: data.userType },
        });

        // Check for first login achievement (fire-and-forget for performance)
        // This is the actual first time user completes their profile and can use the app
        (supabase as any).rpc('check_first_login_achievement', { p_user_id: data.userId })
            .then(({ error }: { error: any }) => {
                if (error) console.error('First login achievement check failed:', error);
            });

        // Check for profile complete achievement (fire-and-forget for performance)
        (supabase as any).rpc('check_profile_complete_achievement', { p_user_id: data.userId })
            .then(({ error }: { error: any }) => {
                if (error) console.error('Profile complete achievement check failed:', error);
            });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error in completeProfile:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}
