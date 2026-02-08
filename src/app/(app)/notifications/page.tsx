import { createServerComponentClient } from '@/lib/supabase/server';
import NotificationList from '@/components/notifications/NotificationList';
import NotificationManager from '@/components/notifications/NotificationManager';
import { Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
    const supabase = await createServerComponentClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return (
            <div className="p-8 text-center">
                <p>Debes iniciar sesión para ver tus notificaciones.</p>
            </div>
        );
    }

    const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 md:py-12 pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <Bell className="w-7 h-7 text-primary" />
                        Notificaciones
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Historial de alertas y avisos del sistema.
                    </p>
                </div>

                <div className="flex-shrink-0 w-full md:w-auto">
                    <NotificationManager />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px] overflow-hidden">
                <div className="p-4 md:p-6 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-sm font-medium text-gray-600">Recientes</h2>
                    <span className="text-xs text-gray-400">
                        {notifications?.length || 0} notificaciones
                    </span>
                </div>

                <div className="p-4 md:p-6">
                    <NotificationList initialNotifications={notifications as any[] || []} />
                </div>
            </div>
        </div>
    );
}
