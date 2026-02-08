'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { type SanctionType } from '@/lib/constants';

// ============================================================
// TYPES
// ============================================================

export interface Sanction {
    id: string;
    unit_id: string;
    condominium_id: string;
    sanction_type: SanctionType;
    reason: string | null;
    amount: number | null;
    starts_at: string;
    ends_at: string | null;
    is_active: boolean;
    created_by: string | null;
    lifted_by: string | null;
    lifted_at: string | null;
    created_at: string;
}

export interface SanctionWithCreator extends Sanction {
    creator?: { full_name: string | null } | null;
    lifter?: { full_name: string | null } | null;
}

export interface CreateSanctionInput {
    unitId: string;
    sanctionType: SanctionType;
    reason?: string;
    amount?: number;
    durationDays?: number | null; // null = indefinite
}

export interface CanBookResult {
    canBook: boolean;
    reasons: string[];
    sanctions: Sanction[];
}

// ============================================================
// SANCTION CRUD OPERATIONS
// ============================================================

/**
 * Get all active sanctions for a unit
 */
export async function getUnitSanctions(
    unitId: string
): Promise<{ success: boolean; sanctions: SanctionWithCreator[]; message?: string }> {
    const supabase = await createServerComponentClient();

    const { data, error } = await supabase
        .from('unit_sanctions')
        .select(`
      *,
      creator:users!unit_sanctions_created_by_fkey(full_name),
      lifter:users!unit_sanctions_lifted_by_fkey(full_name)
    `)
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching sanctions:', error);
        return { success: false, sanctions: [], message: error.message };
    }

    return { success: true, sanctions: (data || []) as any as SanctionWithCreator[] };
}

/**
 * Get active sanctions count for a unit
 */
export async function getActiveSanctionsCount(
    unitId: string
): Promise<number> {
    const supabase = await createServerComponentClient();

    const { count, error } = await supabase
        .from('unit_sanctions')
        .select('*', { count: 'exact', head: true })
        .eq('unit_id', unitId)
        .eq('is_active', true);

    if (error) {
        console.error('Error counting sanctions:', error);
        return 0;
    }

    return count ?? 0;
}

/**
 * Create a new sanction on a unit
 */
export async function createSanction(
    input: CreateSanctionInput
): Promise<{ success: boolean; sanction?: Sanction; message?: string }> {
    const supabase = await createServerComponentClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: 'No autorizado' };
    }

    // Get user's condominium
    const { data: userProfile } = await supabase
        .from('users')
        .select('condominium_id, role')
        .eq('id', user.id)
        .single();

    if (!userProfile || userProfile.role !== 'admin') {
        return { success: false, message: 'Solo administradores pueden crear sanciones' };
    }

    // Verify unit belongs to same condominium
    const { data: unit } = await supabase
        .from('units')
        .select('id, condominium_id')
        .eq('id', input.unitId)
        .single();

    if (!unit || unit.condominium_id !== userProfile.condominium_id) {
        return { success: false, message: 'Unidad no encontrada' };
    }

    // Calculate end date if duration provided
    let endsAt: string | null = null;
    if (input.durationDays !== null && input.durationDays !== undefined) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + input.durationDays);
        endsAt = endDate.toISOString();
    }

    // Create sanction
    const { data: sanction, error } = await supabase
        .from('unit_sanctions')
        .insert({
            unit_id: input.unitId,
            condominium_id: userProfile.condominium_id,
            sanction_type: input.sanctionType,
            reason: input.reason || null,
            amount: input.amount || null,
            ends_at: endsAt,
            created_by: user.id,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating sanction:', error);
        return { success: false, message: error.message };
    }

    revalidatePath('/admin/units');
    return { success: true, sanction: sanction as any };
}

/**
 * Lift (deactivate) a sanction
 */
export async function liftSanction(
    sanctionId: string
): Promise<{ success: boolean; message?: string }> {
    const supabase = await createServerComponentClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: 'No autorizado' };
    }

    // Update sanction
    const { error } = await supabase
        .from('unit_sanctions')
        .update({
            is_active: false,
            lifted_by: user.id,
            lifted_at: new Date().toISOString(),
        })
        .eq('id', sanctionId);

    if (error) {
        console.error('Error lifting sanction:', error);
        return { success: false, message: error.message };
    }

    revalidatePath('/admin/units');
    return { success: true };
}

// ============================================================
// BOOKING VALIDATION
// ============================================================

/**
 * Check if a unit can make bookings (no active sanctions)
 */
export async function checkUnitCanBook(
    unitId: string
): Promise<CanBookResult> {
    const supabase = await createServerComponentClient();

    // Get active sanctions
    const { data: sanctions, error } = await supabase
        .from('unit_sanctions')
        .select('*')
        .eq('unit_id', unitId)
        .eq('is_active', true);

    if (error) {
        console.error('Error checking sanctions:', error);
        return { canBook: true, reasons: [], sanctions: [] }; // Fail open
    }

    if (!sanctions || sanctions.length === 0) {
        return { canBook: true, reasons: [], sanctions: [] };
    }

    // Build reasons list
    const reasons: string[] = [];
    const sanctionLabels: Record<SanctionType, string> = {
        fine: 'Multa pendiente',
        debt: 'Deuda pendiente',
        fee: 'Gastos comunes impagos',
        other: 'Sanción activa',
    };

    for (const sanctionItem of sanctions) {
        const sanction = sanctionItem as any;
        const label = sanctionLabels[sanction.sanction_type as SanctionType];
        const detail = sanction.reason ? `: ${sanction.reason}` : '';
        reasons.push(`${label}${detail}`);
    }

    return {
        canBook: false,
        reasons,
        sanctions: sanctions as any as Sanction[],
    };
}

/**
 * Get sanctions summary for multiple units (for admin list view)
 */
export async function getUnitsSanctionsSummary(
    unitIds: string[]
): Promise<Map<string, number>> {
    const supabase = await createServerComponentClient();

    const { data, error } = await supabase
        .from('unit_sanctions')
        .select('unit_id')
        .in('unit_id', unitIds)
        .eq('is_active', true);

    if (error) {
        console.error('Error fetching sanctions summary:', error);
        return new Map();
    }

    // Count sanctions per unit
    const counts = new Map<string, number>();
    for (const sanction of data || []) {
        const current = counts.get(sanction.unit_id) || 0;
        counts.set(sanction.unit_id, current + 1);
    }

    return counts;
}

