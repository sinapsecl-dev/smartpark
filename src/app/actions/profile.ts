'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { awardXP } from '@/app/actions/gamification';

/**
 * Update user profile (name, phone)
 */
export async function updateProfile(formData: FormData) {
    const supabase = await createServerComponentClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'Usuario no autenticado.' };
    }

    const fullName = formData.get('full_name') as string;
    const phone = formData.get('phone') as string | null;

    if (!fullName?.trim()) {
        return { success: false, message: 'El nombre es requerido.' };
    }

    // Check if profile was previously incomplete
    const { data: existingProfile } = await (supabase
        .from('users') as any)
        .select('full_name')
        .eq('id', user.id)
        .single();

    const wasIncomplete = !existingProfile?.full_name;

    // Update profile
    const { error } = await (supabase
        .from('users') as any)
        .update({
            full_name: fullName.trim(),
            phone: phone?.trim() || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

    if (error) {
        console.error('Error updating profile:', error);
        return { success: false, message: 'Error al actualizar perfil: ' + error.message };
    }

    // Award XP for completing profile (only first time)
    if (wasIncomplete && fullName.trim()) {
        await awardXP(user.id, "PROFILE_COMPLETED");
    }

    revalidatePath('/profile');
    revalidatePath('/dashboard');

    return { success: true, message: 'Perfil actualizado exitosamente.' };
}

/**
 * Update user avatar style
 */
/**
 * Update user avatar style
 */
export async function updateAvatar(style: string, seed: string) {
    const supabase = await createServerComponentClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'Usuario no autenticado.' };
    }

    // Update user_avatars table (cast to any as this table is from gamification migration)
    const { error } = await (supabase as any)
        .from('user_avatars')
        .upsert({
            user_id: user.id,
            avatar_style: style,
            avatar_seed: seed,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id'
        });

    if (error) {
        console.error('Error updating avatar:', error);
        return { success: false, message: 'Error al actualizar avatar: ' + error.message };
    }

    revalidatePath('/profile');
    revalidatePath('/dashboard');

    return { success: true, message: 'Avatar actualizado exitosamente.' };
}

/**
 * Get user profile data
 */
export async function getProfile() {
    const supabase = await createServerComponentClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    // Get user profile
    const { data: profile } = await (supabase
        .from('users') as any)
        .select('id, email, full_name, phone, role, unit_id, units(name)')
        .eq('id', user.id)
        .single();

    // Get avatar (cast to any as this table is from gamification migration)
    const { data: avatar } = await (supabase as any)
        .from('user_avatars')
        .select('avatar_style, avatar_seed')
        .eq('user_id', user.id)
        .single();
    // Get XP and Level
    const { data: xpData } = await (supabase as any)
        .from('user_experience')
        .select('total_xp, level')
        .eq('user_id', user.id)
        .single();

    // Get All Achievements Definitions
    const { data: definitions } = await (supabase as any)
        .from('achievements_definitions')
        .select('*')
        .order('display_order', { ascending: true });

    // Get User Achievements
    const { data: userAchievements } = await (supabase as any)
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id);

    // Get Unit Vehicles
    let vehicles: any[] = [];
    if (profile?.unit_id) {
        const { data } = await (supabase as any)
            .from('unit_vehicles')
            .select('*')
            .eq('unit_id', profile.unit_id)
            .order('created_at', { ascending: true });
        vehicles = data || [];
    }

    return {
        ...profile,
        vehicles,
        avatar: avatar ? {
            style: avatar.avatar_style,
            seed: avatar.avatar_seed
        } : { style: 'bottts', seed: user.id },
        gamification: {
            totalXP: xpData?.total_xp ?? 0,
            level: xpData?.level ?? 1,
            definitions: definitions ?? [],
            userAchievements: userAchievements ?? [],
        }
    };
}
