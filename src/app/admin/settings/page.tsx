import { createServerComponentClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SettingsPageClient from './SettingsPageClient';

export default async function SettingsPage() {
    const supabase = await createServerComponentClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch user profile to verify admin role and get condominium
    const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('role, condominium_id')
        .eq('id', user.id)
        .single();

    if (profileError || !userProfile || userProfile.role !== 'admin') {
        redirect('/dashboard');
    }

    // Fetch condominium settings
    const { data: condominium, error: condoError } = await supabase
        .from('condominiums')
        .select('*')
        .eq('id', userProfile.condominium_id)
        .single();

    if (condoError || !condominium) {
        redirect('/admin');
    }

    // Fetch system rules (Fair Play rules)
    const { data: systemRules } = await supabase
        .from('config_rules')
        .select('*');

    const getRuleValue = (name: string, defaultValue: number) => {
        const rule = systemRules?.find((r) => r.rule_name === name);
        return rule ? parseInt(rule.rule_value) : defaultValue;
    };

    const fairPlayRules = {
        maxReservationDuration: getRuleValue('max_reservation_duration', condominium.max_booking_duration_hours || 4),
        cooldownPeriod: getRuleValue('cooldown_period', condominium.cooldown_period_hours || 2),
        weeklyQuotaHours: getRuleValue('weekly_quota_hours', condominium.max_parking_hours_per_week || 15),
    };

    return (
        <SettingsPageClient
            condominium={{
                id: condominium.id,
                name: condominium.name,
                uniqueCode: condominium.unique_code,
                address: condominium.address || '',
                contactEmail: condominium.contact_email || '',
                contactPhone: condominium.contact_phone || '',
            }}
            fairPlayRules={fairPlayRules}
        />
    );
}
