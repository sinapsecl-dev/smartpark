'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { saveSubscription } from '@/app/lib/subscription-actions';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function NotificationManager() {
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Check if iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

        // Check if standalone (installed)
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsStandalone(isStandaloneMode);

        if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
            setIsSupported(true);
            registerServiceWorker();
        }
    }, []);

    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;

        try {
            // Check if SW is actively controlled
            let registration = await navigator.serviceWorker.ready;

            // In dev mode (sw disabled in next.config), ready might never resolve or be empty
            // We can try to manually register if we are in dev and nothing is active
            if (!registration.active && process.env.NODE_ENV === 'development') {
                console.log('Dev mode: Manually registering SW...');
                registration = await navigator.serviceWorker.register('/sw.js');
            }

            if (registration.active) {
                const sub = await registration.pushManager.getSubscription();
                setSubscription(sub);
            }
        } catch (e) {
            console.warn('Service Worker registration failed/timed out:', e);
        }
    }

    async function subscribeToPush() {
        if (isIOS && !isStandalone) {
            alert("En iOS, debes agregar esta app a Inicio para activar notificaciones.\n\n1. Toca el botón compartir\n2. Selecciona 'Agregar a Inicio'");
            return;
        }

        if (!window.isSecureContext) {
            alert("Error: Las notificaciones requieren una conexión segura (HTTPS). Si estás probando en local desde el celular, esto no funcionará a menos que configures HTTPS o uses un túnel.");
            return;
        }

        setIsLoading(true);
        try {
            if (!('serviceWorker' in navigator)) {
                throw new Error('Service Worker no disponible. Verifica que estás en HTTPS.');
            }

            console.log('Waiting for Service Worker ready...');

            // Timeout race
            const registrationPromise = navigator.serviceWorker.ready;
            const timeoutPromise = new Promise<ServiceWorkerRegistration>((_, reject) =>
                setTimeout(() => reject(new Error('El Service Worker tardó demasiado en iniciar. Recarga la página.')), 5000)
            );

            const registration = await Promise.race([registrationPromise, timeoutPromise]);

            console.log('Service Worker ready:', registration);

            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) throw new Error('Falta VAPID Key pública');

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            console.log('Subscribed:', sub);
            setSubscription(sub);

            // Save to backend
            const result = await saveSubscription(sub.toJSON());
            if (!result.success) throw new Error(result.message);

        } catch (error: any) {
            console.error('Error subscribing:', error);
            alert(`Error: ${error.message}`);
            setSubscription(null);
        } finally {
            setIsLoading(false);
        }
    }

    if (!isSupported && !isIOS) {
        return (
            <div className="text-xs text-muted-foreground p-2">
                Navegador incompatible.
            </div>
        );
    }

    // iOS Instructions
    if (isIOS && !isStandalone) {
        return (
            <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-200">
                <p className="font-semibold mb-1">Activar Notificaciones (iOS)</p>
                <p>Para recibir alertas, agrega esta app a tu pantalla de inicio:</p>
                <ol className="list-decimal list-inside mt-1 ml-1 space-y-1">
                    <li>Toca el botón <strong>Compartir</strong> <span className="text-lg">⎋</span></li>
                    <li>Selecciona <strong>Agregar a Inicio</strong> ⊞</li>
                </ol>
            </div>
        );
    }

    if (subscription) {
        return (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                <Bell className="w-4 h-4" />
                <span className="font-medium">Notificaciones activas</span>
            </div>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={subscribeToPush}
            disabled={isLoading}
            className="gap-2 transition-all active:scale-95"
        >
            {isLoading ? (
                <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Activando...
                </>
            ) : (
                <>
                    <Bell className="w-4 h-4" />
                    Activar Notificaciones
                </>
            )}
        </Button>
    );
}
