'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthHashHandlerProps {
    children: React.ReactNode;
}

/**
 * This component handles hash fragment authentication tokens from Supabase.
 * Supabase invitation links use hash fragments (#access_token=...) which are NOT sent to the server.
 * This client component extracts the token, establishes the session, and then renders children.
 */
export default function AuthHashHandler({ children }: AuthHashHandlerProps) {
    const [isProcessing, setIsProcessing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClientComponentClient();

    useEffect(() => {
        const handleHashTokens = async () => {
            // Check if there's a hash fragment with auth tokens
            const hash = window.location.hash;

            if (hash && hash.includes('access_token')) {
                try {
                    // Supabase client automatically handles the hash fragment tokens
                    // Just calling getSession() will trigger the token exchange
                    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                    if (sessionError) {
                        console.error('Error getting session from hash:', sessionError);
                        setError(sessionError.message);
                        setIsProcessing(false);
                        return;
                    }

                    if (session) {
                        // Session established successfully from hash tokens
                        // Clear the hash from URL for cleaner display
                        window.history.replaceState(null, '', window.location.pathname);

                        // Refresh the page to let the server component see the session
                        router.refresh();
                        setIsProcessing(false);
                        return;
                    } else {
                        // No session could be established
                        setError('No se pudo establecer la sesión. El enlace puede haber expirado.');
                        setIsProcessing(false);
                    }
                } catch (err) {
                    console.error('Error processing auth hash:', err);
                    setError('Error procesando la autenticación');
                    setIsProcessing(false);
                }
            } else {
                // No hash tokens, check for existing session
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    // No session and no hash tokens - redirect to login
                    router.push('/login');
                    return;
                }

                // Session exists, continue normally
                setIsProcessing(false);
            }
        };

        handleHashTokens();
    }, [supabase, router]);

    if (isProcessing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
                    <p className="text-slate-300">Verificando autenticación...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-center max-w-md mx-auto p-6">
                    <div className="text-red-500 mb-4">
                        <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Error de Autenticación</h2>
                    <p className="text-slate-400 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        Volver al Login
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
