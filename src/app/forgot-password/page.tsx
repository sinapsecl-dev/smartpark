'use client';

import React, { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Mail, Loader2, ArrowRight, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { checkUserProvider, sendResetLink } from './actions';
import { createClientComponentClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
    const [isPending, startTransition] = useTransition();
    const [email, setEmail] = useState('');
    const [step, setStep] = useState<'input' | 'provider-check' | 'success'>('input');
    const [providerType, setProviderType] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email) {
            setError('Por favor ingresa tu correo electrónico');
            return;
        }

        startTransition(async () => {
            // Check provider first
            const providerResult = await checkUserProvider(email);

            if (providerResult.auth_provider === 'google') {
                setProviderType('google');
                setStep('provider-check');
            } else {
                // Email provider or unknown (likely email or not found)
                // Proceed to send reset link
                const resetResult = await sendResetLink(email);
                if (resetResult.success) {
                    setStep('success');
                } else {
                    setError(resetResult.error || 'Error al enviar enlace');
                }
            }
        });
    };

    const handleGoogleLogin = async () => {
        const supabase = createClientComponentClient();
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Recuperar Contraseña
                    </h1>
                    {step === 'input' && (
                        <p className="text-gray-500 dark:text-gray-400">
                            Ingresa tu correo para recibir instrucciones
                        </p>
                    )}
                </div>

                <div className="bg-white dark:bg-[#1a2c35] rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">

                    {step === 'input' && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Correo Electrónico
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="tu@email.com"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    <>
                                        Continuar
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>

                            <div className="text-center">
                                <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center gap-2">
                                    <ArrowLeft className="w-4 h-4" />
                                    Volver al inicio de sesión
                                </Link>
                            </div>
                        </form>
                    )}

                    {step === 'provider-check' && providerType === 'google' && (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 mx-auto bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    Cuenta Google Detectada
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300">
                                    Tu dirección de correo <strong>{email}</strong> está vinculada a Google.
                                    Por favor inicia sesión utilizando el botón de Google.
                                </p>
                            </div>

                            <button
                                onClick={handleGoogleLogin}
                                className="w-full py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,8.065,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,19.033-8.136,19.033-19.979C43.967,21.104,43.784,20.597,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,8.065,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,2.83,0.56,5.509,1.556,8.01L12.03,28.267L6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,4.809C7.514,39.564,15.08,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,8.065,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,19.033-8.136,19.033-19.979C43.967,21.104,43.784,20.597,43.611,20.083z"></path>
                                </svg>
                                Iniciar con Google
                            </button>

                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                <p className="text-sm text-gray-500 mb-2">¿Necesitas ayuda?</p>
                                <a
                                    href="mailto:klagos@sinapselab.cl"
                                    className="text-primary hover:underline font-medium block"
                                >
                                    Contactar a Soporte
                                </a>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <Mail className="w-8 h-8 text-green-600" />
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    Revisa tu correo
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300">
                                    Hemos enviado instrucciones para recuperar tu contraseña a <strong>{email}</strong>
                                </p>
                            </div>

                            <Link
                                href="/login"
                                className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                Volver al inicio de sesión
                            </Link>

                            <p className="text-sm text-gray-500">
                                ¿No recibiste el correo? <button onClick={handleSubmit} className="text-primary hover:underline">Reenviar</button>
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
