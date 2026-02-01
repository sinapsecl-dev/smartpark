"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
            <div className="text-center max-w-md">
                <div className="mx-auto w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mb-6">
                    <WifiOff className="w-10 h-10 text-sky-600" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                    Sin conexión a Internet
                </h1>

                <p className="text-gray-600 mb-6">
                    No tienes conexión a Internet en este momento.
                    Algunas funciones estarán disponibles cuando vuelvas a conectarte.
                </p>

                <div className="space-y-3">
                    <p className="text-sm text-gray-500">
                        💡 Puedes ver reservas recientes en caché
                    </p>

                    <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reintentar conexión
                    </button>
                </div>
            </div>
        </div>
    );
}
