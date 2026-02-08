import { createServerComponentClient } from '@/lib/supabase/server';
import { LogOut, ShieldAlert } from 'lucide-react';
import AuthButton from '@/components/shared/AuthButton';

export default async function SuspendedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#151f25] px-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-10 h-10 text-red-600 dark:text-red-500" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Acceso Suspendido
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        El acceso al sistema para este condominio ha sido suspendido temporalmente.
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4 mt-4">
                        Por favor contacte a la administración para regularizar la situación.
                    </p>
                </div>

                <div className="pt-4">
                    <form action="/auth/signout" method="post">
                        <button
                            className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Cerrar Sesión
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
