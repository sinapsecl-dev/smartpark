'use client';

import { createClientComponentClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut } from 'lucide-react';

export default function SuspendedSignOut() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const supabase = createClientComponentClient();

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await supabase.auth.signOut();
            router.push('/login');
            router.refresh();
        } catch (error) {
            console.error('Error signing out:', error);
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleLogout}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
            {isLoading ? (
                <span className="material-symbols-outlined text-white text-[18px] animate-spin">
                    progress_activity
                </span>
            ) : (
                <LogOut className="w-4 h-4" />
            )}
            {isLoading ? 'Cerrando sesión...' : 'Cerrar Sesión'}
        </button>
    );
}
