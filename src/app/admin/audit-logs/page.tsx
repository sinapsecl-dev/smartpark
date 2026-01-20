import { createServerComponentClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AuditLogsPageClient from './AuditLogsPageClient';

export default async function AuditLogsPage() {
    const supabase = await createServerComponentClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch user profile to verify admin role
    const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('role, condominium_id')
        .eq('id', user.id)
        .single();

    if (profileError || !userProfile || userProfile.role !== 'admin') {
        redirect('/dashboard');
    }

    // Fetch initial audit logs (last 50)
    const { data: auditLogs, error: logsError, count } = await supabase
        .from('audit_logs')
        .select('*, users(full_name, email), units(name)', { count: 'exact' })
        .eq('condominium_id', userProfile.condominium_id)
        .order('created_at', { ascending: false })
        .limit(50);

    if (logsError) {
        console.error('Error fetching audit logs:', logsError);
    }

    // Also fetch recent bookings as they are part of the audit trail
    const { data: recentBookings } = await supabase
        .from('bookings')
        .select('*, users(full_name, email), units(name), spots(name)')
        .eq('condominium_id', userProfile.condominium_id)
        .order('created_at', { ascending: false })
        .limit(50);

    // Transform audit logs
    const transformedLogs = (auditLogs || []).map((log: any) => ({
        id: log.id,
        action: log.action,
        date: new Date(log.created_at).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }),
        time: new Date(log.created_at).toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit'
        }),
        timestamp: log.created_at,
        licensePlate: log.license_plate,
        spotName: log.spot_name,
        unitName: log.units?.name || 'N/A',
        userName: log.users?.full_name || log.users?.email || 'Sistema',
        gateId: log.gate_id,
        metadata: log.metadata,
    }));

    // Transform bookings into audit-like entries
    const bookingLogs = (recentBookings || []).map((booking: any) => ({
        id: `booking-${booking.id}`,
        action: 'booking_created' as const,
        date: new Date(booking.created_at).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }),
        time: new Date(booking.created_at).toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit'
        }),
        timestamp: booking.created_at,
        licensePlate: booking.license_plate,
        spotName: booking.spots?.name || 'N/A',
        unitName: booking.units?.name || 'N/A',
        userName: booking.users?.full_name || booking.users?.email || 'N/A',
        gateId: null,
        metadata: {
            status: booking.status,
            startTime: booking.start_time,
            endTime: booking.end_time,
        },
    }));

    // Combine and sort by timestamp
    const allLogs = [...transformedLogs, ...bookingLogs]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 100);

    return (
        <AuditLogsPageClient
            initialLogs={allLogs}
            totalCount={count || allLogs.length}
            condominiumId={userProfile.condominium_id}
        />
    );
}
