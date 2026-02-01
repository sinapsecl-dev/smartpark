'use client';

import React, { useState, useTransition } from 'react';
import { m } from 'framer-motion';
import { Building2, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { linkCondominium } from './actions';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [condominiumCode, setCondominiumCode] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!condominiumCode) {
            setError('Por favor ingresa el código del condominio');
            return;
        }

        startTransition(async () => {
            const result = await linkCondominium(condominiumCode);
            if (result.success) {
                router.push('/dashboard');
            } else {
                setError(result.error || 'Error al vincular el condominio');
            }
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 mb-4">
                        <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Vincular Cuenta
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Para acceder a SmartPark necesitas conectar tu cuenta a un condominio.
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white dark:bg-[#1a2c35] rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Código del Condominio
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={condominiumCode}
                                    onChange={(e) => setCondominiumCode(e.target.value.toUpperCase())}
                                    placeholder="Ej: TERRAZAS-2024"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono tracking-wider"
                                />
                            </div>
                            <div className="mt-2 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <span className="text-blue-500 mt-0.5">ℹ️</span>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    Solicita este código único a la Administración de tu Condominio.
                                </p>
                            </div>
                        </div>

                        {error && (
                            <m.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                            >
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </m.div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation active:scale-[0.98]"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Vinculando...
                                </>
                            ) : (
                                <>
                                    Vincular Cuenta
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </m.div>
        </div>
    );
}
