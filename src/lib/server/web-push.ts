import 'server-only';
import webpush from 'web-push';

// Configure VAPID keys
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
        webpush.setVapidDetails(
            process.env.VAPID_SUBJECT || 'mailto:admin@smartpark.cl',
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
    } catch (err) {
        console.error('Failed to set VAPID details:', err);
    }
}

export const sendNotification = async (
    subscription: webpush.PushSubscription,
    payload: string | Buffer | null
) => {
    try {
        // @ts-ignore - web-push types might be slightly off with strict mode
        const response = await webpush.sendNotification(subscription, payload);
        return response;
    } catch (error: any) {
        console.error('Error sending push notification:', error);
        throw error;
    }
};
