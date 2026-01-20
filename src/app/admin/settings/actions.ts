'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface CondominiumSettings {
    name: string;
    address: string;
    contactEmail: string;
    contactPhone: string;
}

interface FairPlayRules {
    maxReservationDuration: number;
    cooldownPeriod: number;
    weeklyQuotaHours: number;
}

export async function updateCondominiumSettings(
    condominiumId: string,
    settings: CondominiumSettings
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createServerComponentClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'No autorizado' };
        }

        // Verify user is admin of this condominium
        const { data: userProfile } = await supabase
            .from('users')
            .select('role, condominium_id')
            .eq('id', user.id)
            .single();

        if (!userProfile || userProfile.role !== 'admin' || userProfile.condominium_id !== condominiumId) {
            return { success: false, error: 'No tienes permisos para modificar este condominio' };
        }

        const { error } = await supabase
            .from('condominiums')
            .update({
                name: settings.name,
                address: settings.address,
                contact_email: settings.contactEmail,
                contact_phone: settings.contactPhone,
                updated_at: new Date().toISOString(),
            })
            .eq('id', condominiumId);

        if (error) {
            console.error('Error updating condominium:', error);
            return { success: false, error: error.message };
        }

        revalidatePath('/admin/settings');
        return { success: true };
    } catch (error) {
        console.error('Error in updateCondominiumSettings:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

export async function updateFairPlayRules(
    rules: FairPlayRules
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createServerComponentClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'No autorizado' };
        }

        // Verify user is admin
        const { data: userProfile } = await supabase
            .from('users')
            .select('role, condominium_id')
            .eq('id', user.id)
            .single();

        if (!userProfile || userProfile.role !== 'admin') {
            return { success: false, error: 'No tienes permisos de administrador' };
        }

        // Update condominium-level settings
        const { error: condoError } = await supabase
            .from('condominiums')
            .update({
                max_booking_duration_hours: rules.maxReservationDuration,
                cooldown_period_hours: rules.cooldownPeriod,
                max_parking_hours_per_week: rules.weeklyQuotaHours,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userProfile.condominium_id);

        if (condoError) {
            console.error('Error updating condominium rules:', condoError);
            return { success: false, error: condoError.message };
        }

        // Also update/insert config_rules for backward compatibility
        const rulesToUpsert = [
            { rule_name: 'max_reservation_duration', rule_value: String(rules.maxReservationDuration), description: 'Duración máxima de reserva en horas' },
            { rule_name: 'cooldown_period', rule_value: String(rules.cooldownPeriod), description: 'Período de enfriamiento entre reservas en horas' },
            { rule_name: 'weekly_quota_hours', rule_value: String(rules.weeklyQuotaHours), description: 'Cuota semanal máxima en horas' },
        ];

        for (const rule of rulesToUpsert) {
            const { error } = await supabase
                .from('config_rules')
                .upsert(
                    { ...rule, condominium_id: userProfile.condominium_id },
                    { onConflict: 'condominium_id, rule_name' }
                );

            if (error) {
                console.error(`Error upserting rule ${rule.rule_name}:`, error);
            }
        }

        revalidatePath('/admin/settings');
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        console.error('Error in updateFairPlayRules:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}
