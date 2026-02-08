'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@/lib/supabase/client';

export default function NavbarNotification() {
    const [unreadCount, setUnreadCount] = useState(0);
    const supabase = createClientComponentClient();

    useEffect(() => {
        // Initial fetch
        const fetchUnread = async () => {
            const { count } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('read', false);

            setUnreadCount(count || 0);
        };

        fetchUnread();

        // Realtime subscription
        const channel = supabase
            .channel('notifications-count')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications'
                },
                () => {
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    return (
        <Link
            href="/notifications"
            className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#1a262d]" />
            )}
        </Link>
    );
}
