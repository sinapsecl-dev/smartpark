import NotificationSender from '@/components/admin/NotificationSender';
import { createServerComponentClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Bell, History, Megaphone } from 'lucide-react';

export const metadata = {
    title: 'Notificaciones | SmartPark Admin',
    description: 'Enviar notificaciones a residentes',
};

export default async function AdminNotificationsPage() {
    const supabase = await createServerComponentClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    // Verify admin
    const { data: adminProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (adminProfile?.role !== 'admin' && adminProfile?.role !== 'developer') {
        redirect('/dashboard');
    }

    // Fetch recent broadcasts (optional, for history)
    const { data: history } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'info')
        .contains('data', { broadcast: true })
        .order('created_at', { ascending: false })
        .limit(5);

    const notifications = (history || []) as any[];

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
            {/* Container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">

                {/* Page Header */}
                <div className="mb-8 lg:mb-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl shadow-sm">
                            <Megaphone className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                                Centro de Comunicaciones
                            </h1>
                        </div>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-base max-w-2xl leading-relaxed pl-1">
                        Gestiona los anuncios importantes y mantén informada a tu comunidad en tiempo real.
                    </p>
                </div>

                {/* Main Grid */}
                <div className="grid gap-6 lg:gap-8 lg:grid-cols-2 xl:grid-cols-5 items-start">

                    {/* Left Column - Notification Sender */}
                    <div className="lg:col-span-1 xl:col-span-2 order-1">
                        <div className="lg:sticky lg:top-24">
                            <NotificationSender />
                        </div>
                    </div>

                    {/* Right Column - History */}
                    <div className="lg:col-span-1 xl:col-span-3 order-2">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">

                            {/* History Header */}
                            <div className="px-5 py-4 sm:px-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <History className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                                Historial de Envíos
                                            </h2>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Últimas notificaciones enviadas
                                            </p>
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-200 dark:ring-gray-700">
                                        {notifications.length} / 5
                                    </span>
                                </div>
                            </div>

                            {/* History Content */}
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {notifications && notifications.length > 0 ? (
                                    notifications.map((notif, index) => (
                                        <div
                                            key={notif.id}
                                            className="px-5 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group"
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Icon */}
                                                <div className="flex-shrink-0 mt-0.5">
                                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                        <Bell className="w-4 h-4 text-primary" />
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors truncate">
                                                        {notif.title}
                                                    </h3>
                                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                                        {notif.body}
                                                    </p>
                                                </div>

                                                {/* Date */}
                                                <div className="flex-shrink-0 text-right">
                                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
                                                        {new Date(notif.created_at).toLocaleDateString('es-CL', {
                                                            day: 'numeric',
                                                            month: 'short'
                                                        })}
                                                    </p>
                                                    <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-0.5">
                                                        {new Date(notif.created_at).toLocaleTimeString('es-CL', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-5 py-16 sm:px-6 text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                                            <Bell className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                                        </div>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                                            Sin notificaciones recientes
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                                            Las alertas que envíes aparecerán aquí para tu referencia y seguimiento.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
