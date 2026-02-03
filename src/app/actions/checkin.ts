'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { awardXP } from '@/app/actions/gamification';
import { revalidatePath } from 'next/cache';

/**
 * Perform check-in for a booking
 * Can be called by Guard or Admin
 */
export async function performCheckIn(bookingId: string) {
    const supabase = await createServerComponentClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'Usuario no autenticado.' };
    }

    // Verify user role (must be admin or guard/concierge)
    // We assume 'admin' or 'guard' roles. 
    // Checking profile...
    const { data: userProfile } = await (supabase.from('users') as any)
        .select('role')
        .eq('id', user.id)
        .single();

    if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'concierge')) {
        // Assuming 'concierge' is the role name for 'Conserje'
        // If generic 'guard' is used, update accordingly. 
        // For now allowing admin and concierge.
        // If strictly generic, maybe check "can_scan" permission?
        // Let's assume 'concierge' based on user prompt "Conserjes".
        return { success: false, message: 'No tienes permisos para realizar check-in.' };
    }

    // Fetch booking
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

    if (fetchError || !booking) {
        return { success: false, message: 'Reserva no encontrada.' };
    }

    if (booking.status === 'active' || booking.status === 'completed') {
        return { success: false, message: 'La reserva ya fue activada o completada.' };
    }

    // Update booking status to 'active' (meaning checked in)
    // And set actual_start_time if strictly tracking
    const now = new Date();

    // Note: 'bookings' table might not have 'actual_start_time'. 
    // If not, we just rely on status change and audit log.
    const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'active' } as any) // Cast if status enum mismatch
        .eq('id', bookingId);

    if (updateError) {
        return { success: false, message: 'Error al actualizar reserva: ' + updateError.message };
    }

    // Insert audit log
    await supabase.from('audit_logs').insert({
        user_id: user.id, // Who performed the check-in (the guard)
        action: 'check_in',
        target_resource: 'bookings',
        resource_id: bookingId,
        details: { checked_in_at: now.toISOString() }
    } as any);

    // Award XP to the USER WHO BOOKED (not the guard)
    // Check if on time? awardXP logic handles "CHECK_IN_ON_TIME" logic internally?
    // No, awardXP expects us to pass "CHECK_IN_ON_TIME" if it's on time.
    // Or we pass generic "CHECK_IN" and it decides?
    // The action is "CHECK_IN_ON_TIME". 
    // Logic: compare now vs booking.start_time.
    // Allow 15 min buffer?
    const startTime = new Date(booking.start_time);
    const diffMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);

    // If check-in is within -15 to +15 mins of start time (or just "not too late")
    // Let's say "On Time" is arriving before start_time + 15 mins.
    const isOnTime = diffMinutes <= 15;

    if (isOnTime && booking.user_id) {
        await awardXP(booking.user_id, "CHECK_IN_ON_TIME", bookingId);
    }

    revalidatePath('/admin/scan'); // Assuming a scan page exists
    revalidatePath('/dashboard');

    return { success: true, message: 'Check-in realizado exitosamente.' };
}

/**
 * Perform check-out for a booking
 */
export async function performCheckOut(bookingId: string) {
    const supabase = await createServerComponentClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'Usuario no autenticado.' };
    }

    // Verify user role
    const { data: userProfile } = await (supabase.from('users') as any)
        .select('role')
        .eq('id', user.id)
        .single();

    if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'concierge')) {
        return { success: false, message: 'No tienes permisos para realizar check-out.' };
    }

    // Fetch booking
    const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

    if (!booking) {
        return { success: false, message: 'Reserva no encontrada.' };
    }

    if (booking.status === 'completed') {
        return { success: false, message: 'La reserva ya fue completada.' };
    }

    // Update status to 'completed'
    const now = new Date();
    const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'completed' } as any)
        .eq('id', bookingId);

    if (updateError) {
        return { success: false, message: 'Error al finalizar reserva.' };
    }

    // Insert audit log
    await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'check_out',
        target_resource: 'bookings',
        resource_id: bookingId,
        details: { checked_out_at: now.toISOString() }
    } as any);

    // Award XP for completion
    // Check if on time (before end_time)
    const endTime = new Date(booking.end_time);
    const isLate = now > endTime;

    // Always award completion?
    if (booking.user_id) {
        await awardXP(booking.user_id, "BOOKING_COMPLETED", bookingId);

        if (!isLate) {
            await awardXP(booking.user_id, "CHECK_OUT_ON_TIME", bookingId);
        }
    }

    revalidatePath('/admin/scan');
    revalidatePath('/dashboard');

    return { success: true, message: 'Check-out realizado exitosamente.' };
}
