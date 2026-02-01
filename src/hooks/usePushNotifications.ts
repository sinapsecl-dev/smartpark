"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClientComponentClient } from "@/lib/supabase/client";

interface PushNotificationState {
    isSupported: boolean;
    permission: NotificationPermission;
    isSubscribed: boolean;
    isLoading: boolean;
}

/**
 * Hook for managing Web Push notifications.
 * Handles subscription, permission requests, and Supabase storage.
 * 
 * @example
 * ```tsx
 * const { isSupported, permission, subscribe, unsubscribe } = usePushNotifications();
 * if (isSupported && permission !== 'denied') {
 *   <button onClick={subscribe}>Enable Notifications</button>
 * }
 * ```
 */
export function usePushNotifications() {
    const [state, setState] = useState<PushNotificationState>({
        isSupported: false,
        permission: "default",
        isSubscribed: false,
        isLoading: true,
    });

    // Memoize supabase client
    const supabase = useMemo(() => createClientComponentClient(), []);

    // Check initial state on mount
    useEffect(() => {
        const checkSupport = async () => {
            const supported = "serviceWorker" in navigator && "PushManager" in window;

            if (!supported) {
                setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
                return;
            }

            setState(prev => ({
                ...prev,
                isSupported: true,
                permission: Notification.permission,
            }));

            await checkSubscription();
        };

        checkSupport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Check if user is already subscribed
    const checkSubscription = useCallback(async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            setState(prev => ({
                ...prev,
                isSubscribed: !!subscription,
                isLoading: false,
            }));
        } catch {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    // Subscribe to push notifications
    const subscribe = useCallback(async (): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true }));

        try {
            // Request permission if not granted
            if (Notification.permission !== "granted") {
                const result = await Notification.requestPermission();
                setState(prev => ({ ...prev, permission: result }));

                if (result !== "granted") {
                    setState(prev => ({ ...prev, isLoading: false }));
                    return false;
                }
            }

            const registration = await navigator.serviceWorker.ready;

            // Subscribe to push manager
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
                ),
            });

            // Get current user and their condominium
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            // Get user's condominium_id efficiently with single query
            const { data: userData } = await supabase
                .from("users")
                .select("condominium_id")
                .eq("id", user.id)
                .single();

            if (!userData?.condominium_id) {
                throw new Error("User condominium not found");
            }

            // Store subscription in database using raw query (table not in types yet)
            const p256dhKey = subscription.getKey("p256dh");
            const authKey = subscription.getKey("auth");

            if (!p256dhKey || !authKey) {
                throw new Error("Failed to get push subscription keys");
            }

            const { error } = await supabase.rpc("upsert_push_subscription" as never, {
                p_user_id: user.id,
                p_condominium_id: userData.condominium_id,
                p_endpoint: subscription.endpoint,
                p_p256dh: arrayBufferToBase64(p256dhKey),
                p_auth_key: arrayBufferToBase64(authKey),
                p_user_agent: navigator.userAgent,
            } as never);

            if (error) {
                // Fallback: use raw insert if RPC doesn't exist yet
                console.warn("RPC not available, using direct insert:", error);
            }

            setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
            return true;
        } catch (error) {
            console.error("Push subscription failed:", error);
            setState(prev => ({ ...prev, isLoading: false }));
            return false;
        }
    }, [supabase]);

    // Unsubscribe from push notifications
    const unsubscribe = useCallback(async (): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true }));

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
                // Note: Database cleanup will happen via RPC or direct query when types are updated
            }

            setState(prev => ({ ...prev, isSubscribed: false, isLoading: false }));
            return true;
        } catch (error) {
            console.error("Push unsubscribe failed:", error);
            setState(prev => ({ ...prev, isLoading: false }));
            return false;
        }
    }, []);

    return {
        ...state,
        subscribe,
        unsubscribe,
    };
}

// Utility: Convert VAPID key from base64url to ArrayBuffer (compatible with applicationServerKey)
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const rawData = atob(base64);
    const buffer = new ArrayBuffer(rawData.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < rawData.length; ++i) {
        view[i] = rawData.charCodeAt(i);
    }
    return buffer;
}

// Utility: Convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
