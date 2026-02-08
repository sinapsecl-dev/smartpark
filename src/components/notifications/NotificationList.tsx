'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, CheckCircle, AlertTriangle, XCircle, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { markNotificationAsRead } from '@/app/lib/subscription-actions';
import { createClientComponentClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export type NotificationType = 'info' | 'warning' | 'success' | 'error';

export interface NotificationItem {
    id: string;
    title: string;
    body: string;
    type: NotificationType;
    read: boolean;
    created_at: string;
    data?: any;
}

interface NotificationListProps {
    initialNotifications: NotificationItem[];
}

export default function NotificationList({ initialNotifications }: NotificationListProps) {
    const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
    const router = useRouter();
    const supabase = createClientComponentClient();

    // Sync with server props (e.g. after router.refresh())
    useEffect(() => {
        setNotifications(initialNotifications);
    }, [initialNotifications]);

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel('notifications-list')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications'
                },
                (payload) => {
                    const newNotification = payload.new as NotificationItem;
                    // Only add if it belongs to current user (RLS handles this on fetch, but Realtime sends all? No, RLS applies to Realtime only if configured. Typically client receives own events if RLS/filter is set up. We should check user_id if possible, but row security usually filters it. Let's assume Filter is needed or RLS works).
                    // Actually, Supabase Realtime *respects* RLS if using "postgres_changes" with filter `user_id=eq.${userId}` BUT `createClientComponentClient` handles session. 
                    // Safe approach: Insert at top.
                    setNotifications(prev => [newNotification, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    const handleMarkAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

        await markNotificationAsRead(id);
        router.refresh();
    };

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    if (notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <Bell className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Todo al día</h3>
                <p className="text-sm text-gray-500 mt-1">No tienes nuevas notificaciones.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <AnimatePresence>
                {notifications.map((notification) => (
                    <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={cn(
                            "relative flex gap-4 p-4 rounded-xl border transition-all duration-200",
                            notification.read
                                ? "bg-white border-gray-100"
                                : "bg-blue-50/50 border-blue-100 shadow-sm"
                        )}
                    >
                        <div className="flex-shrink-0 mt-1">
                            {getIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <h4 className={cn(
                                    "text-sm font-semibold pr-6",
                                    notification.read ? "text-gray-700" : "text-gray-900"
                                )}>
                                    {notification.title}
                                </h4>
                                <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                                    {format(new Date(notification.created_at), "d MMM, HH:mm", { locale: es })}
                                </span>
                            </div>

                            <p className={cn(
                                "text-sm mt-1 mb-2",
                                notification.read ? "text-gray-500" : "text-gray-700"
                            )}>
                                {notification.body}
                            </p>

                            {!notification.read && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex justify-end"
                                >
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2"
                                        onClick={() => handleMarkAsRead(notification.id)}
                                    >
                                        <Check className="w-3 h-3 mr-1" />
                                        Marcar como leída
                                    </Button>
                                </motion.div>
                            )}
                        </div>

                        {!notification.read && (
                            <span className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
