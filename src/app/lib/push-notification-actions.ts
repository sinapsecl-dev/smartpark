'use server';
import 'server-only';

import { createServerComponentClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/server/web-push';


/**
 * Send Push Notification to a user (all devices)
 */
export async function sendPushNotification(userId: string, payload: { title: string; body: string; url?: string; type?: string }) {
    const supabase = await createServerComponentClient();

    // 1. Get user subscriptions
    const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

    if (!subscriptions || subscriptions.length === 0) {
        return { success: false, message: 'Usuario sin dispositivos suscritos.' };
    }

    // 2. Send concurrent notifications
    const notifications = subscriptions.map((sub: any) => {
        const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
                auth: sub.auth,
                p256dh: sub.p256dh
            }
        };

        const notificationPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url,
            type: payload.type
        });

        // @ts-ignore
        return sendNotification(pushSubscription, notificationPayload)
            .catch(async (error: any) => {
                if (error.statusCode === 410 || error.statusCode === 404) {
                    // Subscription expired/invalid -> Delete from DB
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                }
                console.error('Error sending push:', error);
            });
    });

    await Promise.all(notifications);
    return { success: true };
}

/**
 * Create a notification (DB + Push)
 */
export async function createNotification(
    userId: string,
    title: string,
    body: string,
    type: 'info' | 'warning' | 'success' | 'error' = 'info',
    data: any = {}
) {
    const supabase = await createServerComponentClient();

    // 1. Insert into DB
    const { error } = await supabase
        .from('notifications')
        .insert({
            user_id: userId,
            title,
            body,
            type,
            data,
            read: false
        } as any);

    if (error) {
        console.error('Error creating notification record:', error);
    }

    // 2. Send Push
    await sendPushNotification(userId, {
        title,
        body,
        url: data.url,
        type
    });

    return { success: true };
}
