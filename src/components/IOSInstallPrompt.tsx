"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Share } from "lucide-react";

/**
 * iOS Install Prompt - Shows installation instructions for iOS Safari users.
 * Only appears on iOS devices not running in standalone mode.
 * Uses localStorage to prevent repeated prompts.
 */
export function IOSInstallPrompt() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Only run on client
        if (typeof window === "undefined") return;

        // Detect iOS Safari
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isStandalone =
            "standalone" in window.navigator &&
            (window.navigator as unknown as { standalone: boolean }).standalone;
        const isDismissed = localStorage.getItem("ios-install-prompt-dismissed");

        // Show prompt only on iOS, not in standalone mode, and not previously dismissed
        if (isIOS && !isStandalone && !isDismissed) {
            // Delay to not interrupt initial app experience
            const timer = setTimeout(() => setShow(true), 4000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = useCallback(() => {
        setShow(false);
        localStorage.setItem("ios-install-prompt-dismissed", "true");
    }, []);

    const handleRemindLater = useCallback(() => {
        setShow(false);
        // Don't set localStorage - will show again next session
    }, []);

    if (!show) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white border-2 border-sky-500 rounded-xl shadow-2xl p-4 max-w-md mx-auto">
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Cerrar"
                >
                    <X size={20} />
                </button>

                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📱</span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base mb-1">
                            Instala SmartParking
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                            Para recibir notificaciones sobre tus reservas:
                        </p>

                        <ol className="text-sm text-gray-700 space-y-2 mb-4">
                            <li className="flex items-center gap-2">
                                <span className="flex-shrink-0 w-5 h-5 bg-sky-100 rounded-full text-xs flex items-center justify-center font-medium text-sky-700">
                                    1
                                </span>
                                <span>
                                    Toca{" "}
                                    <Share className="inline w-4 h-4 text-sky-600" />{" "}
                                    <strong>Compartir</strong>
                                </span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="flex-shrink-0 w-5 h-5 bg-sky-100 rounded-full text-xs flex items-center justify-center font-medium text-sky-700">
                                    2
                                </span>
                                <span>
                                    Selecciona <strong>&quot;Añadir a pantalla de inicio&quot;</strong>
                                </span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="flex-shrink-0 w-5 h-5 bg-sky-100 rounded-full text-xs flex items-center justify-center font-medium text-sky-700">
                                    3
                                </span>
                                <span>
                                    Toca <strong>&quot;Añadir&quot;</strong>
                                </span>
                            </li>
                        </ol>

                        <div className="flex gap-2">
                            <button
                                onClick={handleRemindLater}
                                className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Ahora no
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="flex-1 px-3 py-2 text-sm bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
