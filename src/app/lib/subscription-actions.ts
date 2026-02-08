'use server';

import { createServerComponentClient } from '@/lib/supabase/server';

export interface PushSubscriptionJSON {
    endpoint?: string;
    keys?: {
        auth?: string;
        p256dh?: string;
    };
}

/**
 * Save user's Web Push subscription
 * Safe to be called from Client Components
 */
export async function saveSubscription(subscription: PushSubscriptionJSON) {
    const supabase = await createServerComponentClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'Usuario no autenticado.' };
    }

    if (!subscription.endpoint || !subscription.keys?.auth || !subscription.keys?.p256dh) {
        return { success: false, message: 'Suscripción inválida.' };
    }

    // Get user profile to find condominium_id
    const { data: userProfile } = await supabase
        .from('users')
        .select('condominium_id')
        .eq('id', user.id)
        .single();

    if (!userProfile?.condominium_id) {
        return { success: false, message: 'Usuario sin condominio asignado.' };
    }

    const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
            user_id: user.id,
            condominium_id: userProfile.condominium_id,
            endpoint: subscription.endpoint,
            auth_key: subscription.keys.auth,
            p256dh: subscription.keys.p256dh,
            updated_at: new Date().toISOString()
        } as any, { onConflict: 'endpoint' });

    if (error) {
        console.error('Error saving subscription:', error);
        return { success: false, message: 'Error al guardar suscripción: ' + error.message };
    }

    return { success: true, message: 'Notificaciones activadas.' };
}

/**
 * Mark notification as read
 * Safe to be called from Client Components
 */
export async function markNotificationAsRead(notificationId: string) {
    const supabase = await createServerComponentClient();
    await supabase
        .from('notifications')
        .update({ read: true } as any)
        .eq('id', notificationId);

    return { success: true };
}
