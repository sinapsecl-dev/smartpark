'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface CreateUnitData {
    name: string;
    weeklyQuotaHours: number;
    condominiumId: string;
}

interface UpdateUnitData {
    name: string;
    weeklyQuotaHours: number;
    status: 'active' | 'delinquent';
}

export async function createUnit(
    data: CreateUnitData
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createServerComponentClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'No autorizado' };
        }

        // Verify admin role
        const { data: adminProfile } = await supabase
            .from('users')
            .select('role, condominium_id')
            .eq('id', user.id)
            .single();

        if (!adminProfile || adminProfile.role !== 'admin') {
            return { success: false, error: 'No tienes permisos de administrador' };
        }

        // Verify condominium matches
        if (adminProfile.condominium_id !== data.condominiumId) {
            return { success: false, error: 'No autorizado para este condominio' };
        }

        // Check for duplicate name
        const { data: existingUnit } = await supabase
            .from('units')
            .select('id')
            .eq('condominium_id', data.condominiumId)
            .eq('name', data.name)
            .single();

        if (existingUnit) {
            return { success: false, error: 'Ya existe una unidad con este nombre' };
        }

        // Create unit
        const { error: insertError } = await supabase
            .from('units')
            .insert({
                name: data.name,
                weekly_quota_hours: data.weeklyQuotaHours,
                condominium_id: data.condominiumId,
                status: 'active',
                current_week_usage_minutes: 0,
            });

        if (insertError) {
            console.error('Error creating unit:', insertError);
            return { success: false, error: insertError.message };
        }

        revalidatePath('/admin/units');
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Error in createUnit:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

export async function updateUnit(
    unitId: string,
    data: UpdateUnitData
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createServerComponentClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'No autorizado' };
        }

        // Verify admin role
        const { data: adminProfile } = await supabase
            .from('users')
            .select('role, condominium_id')
            .eq('id', user.id)
            .single();

        if (!adminProfile || adminProfile.role !== 'admin') {
            return { success: false, error: 'No tienes permisos de administrador' };
        }

        // Verify unit belongs to admin's condominium
        const { data: unit } = await supabase
            .from('units')
            .select('id, condominium_id')
            .eq('id', unitId)
            .single();

        if (!unit || unit.condominium_id !== adminProfile.condominium_id) {
            return { success: false, error: 'Unidad no encontrada' };
        }

        // Update unit
        const { error: updateError } = await supabase
            .from('units')
            .update({
                name: data.name,
                weekly_quota_hours: data.weeklyQuotaHours,
                status: data.status,
            })
            .eq('id', unitId);

        if (updateError) {
            console.error('Error updating unit:', updateError);
            return { success: false, error: updateError.message };
        }

        revalidatePath('/admin/units');
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Error in updateUnit:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

export async function deleteUnit(
    unitId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createServerComponentClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'No autorizado' };
        }

        // Verify admin role
        const { data: adminProfile } = await supabase
            .from('users')
            .select('role, condominium_id')
            .eq('id', user.id)
            .single();

        if (!adminProfile || adminProfile.role !== 'admin') {
            return { success: false, error: 'No tienes permisos de administrador' };
        }

        // Verify unit belongs to admin's condominium
        const { data: unit } = await supabase
            .from('units')
            .select('id, condominium_id')
            .eq('id', unitId)
            .single();

        if (!unit || unit.condominium_id !== adminProfile.condominium_id) {
            return { success: false, error: 'Unidad no encontrada' };
        }

        // Check for active bookings
        const { count: activeBookings } = await supabase
            .from('bookings')
            .select('id', { count: 'exact' })
            .eq('unit_id', unitId)
            .in('status', ['confirmed', 'active']);

        if (activeBookings && activeBookings > 0) {
            return { success: false, error: 'No se puede eliminar: tiene reservas activas' };
        }

        // Unassign users from this unit
        await supabase
            .from('users')
            .update({ unit_id: null })
            .eq('unit_id', unitId);

        // Delete unit
        const { error: deleteError } = await supabase
            .from('units')
            .delete()
            .eq('id', unitId);

        if (deleteError) {
            console.error('Error deleting unit:', deleteError);
            return { success: false, error: deleteError.message };
        }

        revalidatePath('/admin/units');
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Error in deleteUnit:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}
