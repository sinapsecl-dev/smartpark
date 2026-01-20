import { createServerComponentClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminDashboardPage() {
  const supabase = await createServerComponentClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile to verify admin role and get condominium_id
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('role, condominium_id')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile || userProfile.role !== 'admin') {
    redirect('/dashboard'); // Non-admins go to resident dashboard
  }

  const condominiumId = userProfile.condominium_id;

  // Fetch dashboard data in parallel for efficiency
  const [
    spotsResult,
    activeBookingsResult,
    topReserversResult,
    recentLogsResult,
    systemRulesResult,
    zombieVehiclesResult,
  ] = await Promise.all([
    // Total spots count for this condominium
    supabase.from('spots').select('id', { count: 'exact' }).eq('condominium_id', condominiumId),

    // Active bookings (currently occupied) for this condominium
    supabase
      .from('bookings')
      .select('id', { count: 'exact' })
      .eq('condominium_id', condominiumId)
      .or('status.eq.confirmed,status.eq.active')
      .lte('start_time', new Date().toISOString())
      .gte('end_time', new Date().toISOString()),

    // Top reservers this month for this condominium
    supabase
      .from('bookings')
      .select('unit_id, units(name)')
      .eq('condominium_id', condominiumId)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

    // Recent audit logs (bookings) for this condominium
    supabase
      .from('bookings')
      .select('*, units(name)')
      .eq('condominium_id', condominiumId)
      .order('created_at', { ascending: false })
      .limit(10),

    // System rules (config_rules table)
    supabase.from('config_rules').select('*'),

    // Zombie vehicles (over 24h) for this condominium
    supabase
      .from('bookings')
      .select('id', { count: 'exact' })
      .eq('condominium_id', condominiumId)
      .or('status.eq.confirmed,status.eq.active')
      .lt('start_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .gte('end_time', new Date().toISOString()),
  ]);

  // Process spots and occupancy
  const totalSpots = spotsResult.count || 0;
  const occupiedSpots = activeBookingsResult.count || 0;
  const occupancyPercentage = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0;

  // Process top reservers
  const reserverCounts: Record<string, { name: string; count: number }> = {};
  if (topReserversResult.data) {
    for (const booking of topReserversResult.data as any[]) {
      const unitId = booking.unit_id;
      const unitName = booking.units?.name || `Unit ${unitId?.slice(0, 8)}`;
      if (unitId) {
        if (!reserverCounts[unitId]) {
          reserverCounts[unitId] = { name: unitName, count: 0 };
        }
        reserverCounts[unitId].count++;
      }
    }
  }
  const topReservers = Object.entries(reserverCounts)
    .map(([_, data]) => data)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((data, index) => ({
      rank: index + 1,
      unitName: data.name,
      reservationCount: data.count,
    }));

  // Process audit logs
  const auditLogs = (recentLogsResult.data || []).map((log: any) => ({
    id: log.id,
    date: new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    licensePlate: log.license_plate,
    action: 'booking' as const,
    unitName: log.units?.name || `Unit ${log.unit_id?.slice(0, 8) || 'Unknown'}`,
    gateId: undefined,
  }));

  // Process system rules
  const systemRules = systemRulesResult.data || [];
  const getRuleValue = (name: string, defaultValue: number) => {
    const rule = systemRules.find((r: any) => r.rule_name === name);
    return rule ? parseInt(rule.rule_value) : defaultValue;
  };

  const fairPlayRules = {
    maxReservationDuration: getRuleValue('max_reservation_duration', 4),
    cooldownPeriod: getRuleValue('cooldown_period', 2),
    weeklyQuotaHours: getRuleValue('weekly_quota_hours', 15),
  };

  // Zombie vehicles count
  const zombieVehiclesCount = zombieVehiclesResult.count || 0;

  return (
    <AdminDashboardClient
      occupancyPercentage={occupancyPercentage}
      occupiedSpots={occupiedSpots}
      totalSpots={totalSpots}
      zombieVehiclesCount={zombieVehiclesCount}
      topReservers={topReservers}
      fairPlayRules={fairPlayRules}
      auditLogs={auditLogs}
      totalAuditLogs={recentLogsResult.data?.length || 0}
    />
  );
}
