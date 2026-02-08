'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// Helper to check developer role
async function checkDeveloper(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: isDev } = await supabase.rpc('is_developer');
    return !!isDev;
}

export async function getCondominiums() {
    const supabase = await createServerComponentClient();

    if (!(await checkDeveloper(supabase))) {
        throw new Error('Unauthorized');
    }

    const { data, error } = await supabase
        .from('condominiums')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function suspendCondominium(id: string) {
    const supabase = await createServerComponentClient();

    if (!(await checkDeveloper(supabase))) {
        throw new Error('Unauthorized');
    }

    // 1. Set status = 'suspended'
    const { error: updateError } = await supabase
        .from('condominiums')
        .update({ status: 'suspended' })
        .eq('id', id);

    if (updateError) throw updateError;

    // 2. Cancel active bookings
    // Find units first
    const { data: units } = await supabase
        .from('units')
        .select('id')
        .eq('condominium_id', id);

    if (units && units.length > 0) {
        const unitIds = units.map(u => u.id);

        // Cancel 'confirmed' and 'active' bookings
        const { error: cancelError } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .in('unit_id', unitIds)
            .in('status', ['confirmed', 'active']);

        if (cancelError) {
            console.error('Error cancelling bookings during suspension:', cancelError);
        }
    }

    // 3. Log to audit_logs
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from('audit_logs').insert({
            action: 'suspend_condominium',
            details: { condominium_id: id, reason: 'Developer Action' },
            user_id: user.id
        });
    }

    revalidatePath('/admin/condominiums');
}

export async function activateCondominium(id: string) {
    const supabase = await createServerComponentClient();

    if (!(await checkDeveloper(supabase))) {
        throw new Error('Unauthorized');
    }

    const { error } = await supabase
        .from('condominiums')
        .update({ status: 'active' })
        .eq('id', id);

    if (error) throw error;

    // Log to audit_logs
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from('audit_logs').insert({
            action: 'activate_condominium',
            details: { condominium_id: id, reason: 'Developer Action' },
            user_id: user.id
        });
    }

    revalidatePath('/admin/condominiums');
}

export async function deleteCondominium(id: string) {
    const supabase = await createServerComponentClient();

    if (!(await checkDeveloper(supabase))) {
        throw new Error('Unauthorized');
    }

    const { error } = await supabase
        .from('condominiums')
        .delete()
        .eq('id', id);

    if (error) throw error;

    // Log to audit_logs
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from('audit_logs').insert({
            action: 'delete_condominium',
            details: { condominium_id: id, reason: 'Developer Action' },
            user_id: user.id
        });
    }

    revalidatePath('/admin/condominiums');
}

export async function setDeveloperCondominium(id: string) {
    const supabase = await createServerComponentClient();

    if (!(await checkDeveloper(supabase))) {
        throw new Error('Unauthorized');
    }

    // Update user's condominium_id in DB to switch context
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user');

    const { error } = await supabase
        .from('users')
        .update({ condominium_id: id })
        .eq('id', user.id);

    if (error) throw error;
    revalidatePath('/admin');
    revalidatePath('/dashboard'); // Just in case
}
