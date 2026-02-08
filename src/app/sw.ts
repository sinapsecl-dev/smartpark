/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: false,
    clientsClaim: false,
    navigationPreload: true,
    runtimeCaching: defaultCache,
    fallbacks: {
        entries: [
            {
                url: "/offline",
                matcher: ({ request }: { request: Request }) => request.destination === "document",
            },
        ],
    },
});

// Push Notification Handler - show notification when received
self.addEventListener("push", (event: PushEvent) => {
    const data = event.data?.json() ?? {};

    const options: NotificationOptions = {
        body: data.body || "Nueva notificación de SmartParking",
        icon: "/android-chrome-192x192.png",
        badge: "/favicon.ico",
        data: {
            url: data.url || "/",
            type: data.type || "default",
            timestamp: Date.now(),
        },
        tag: data.tag || "smartparking-notification",
        requireInteraction: data.requireInteraction ?? false,
    };

    event.waitUntil(
        self.registration.showNotification(data.title || "SmartParking", options)
    );
});

// Handle notification click - open app or focus existing window
self.addEventListener("notificationclick", (event: NotificationEvent) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || "/";

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList: readonly WindowClient[]) => {
                // Focus existing window if found
                for (const client of clientList) {
                    if (client.url.includes(targetUrl) && "focus" in client) {
                        return client.focus();
                    }
                }
                // Open new window if none found
                if (self.clients.openWindow) {
                    return self.clients.openWindow(targetUrl);
                }
            })
    );
});

serwist.addEventListeners();
