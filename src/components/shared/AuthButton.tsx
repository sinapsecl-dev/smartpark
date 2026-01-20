'use client';

import { createClientComponentClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

interface AuthButtonProps {
  variant?: 'icon' | 'full';
  className?: string;
}

export default function AuthButton({ variant = 'icon', className = '' }: AuthButtonProps) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  if (!user) return null;

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`
        group relative flex items-center justify-center
        w-9 h-9 rounded-lg
        bg-gray-50 dark:bg-gray-800
        hover:bg-red-50 dark:hover:bg-red-900/30
        border border-gray-100 dark:border-gray-700
        hover:border-red-200 dark:hover:border-red-800
        transition-all touch-manipulation
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title="Cerrar sesión"
    >
      {isLoading ? (
        <span className="material-symbols-outlined text-gray-400 text-[18px] animate-spin">
          progress_activity
        </span>
      ) : (
        <span className="material-symbols-outlined text-gray-400 group-hover:text-red-500 text-[18px] transition-colors">
          logout
        </span>
      )}
    </button>
  );
}
