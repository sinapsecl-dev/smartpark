import { createServerComponentClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import UnitsPageClient from './UnitsPageClient';

export const dynamic = 'force-dynamic';

export default async function UnitsPage() {
    const supabase = await createServerComponentClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // Get admin profile with condominium
    const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('role, condominium_id')
        .eq('id', user.id)
        .single();

    if (profileError || !userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'developer')) {
        redirect('/dashboard');
    }

    const condominiumId = userProfile.condominium_id;

    // Fetch units for this condominium
    const { data: units } = await supabase
        .from('units')
        .select(`
      id,
      name,
      status,
      weekly_quota_hours,
      current_week_usage_minutes,
      last_booking_end_time,
      created_at,
      users(id, email, full_name, status)
    `)
        .eq('condominium_id', condominiumId)
        .order('name', { ascending: true });

    // Transform data for client
    const transformedUnits = (units || []).map((unit: any) => ({
        id: unit.id,
        name: unit.name,
        status: unit.status,
        weeklyQuotaHours: unit.weekly_quota_hours,
        currentWeekUsageMinutes: unit.current_week_usage_minutes,
        lastBookingEndTime: unit.last_booking_end_time,
        createdAt: unit.created_at,
        assignedUsers: unit.users || [],
    }));

    return (
        <UnitsPageClient
            initialUnits={transformedUnits}
            condominiumId={condominiumId}
        />
    );
}
