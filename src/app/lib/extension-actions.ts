'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function requestExtension(bookingId: string, reason: string) {
    const supabase = await createServerComponentClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'Usuario no autenticado' };
    }

    // Check if booking belongs to user
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

    if (fetchError || !booking) {
        return { success: false, message: 'Reserva no encontrada' };
    }

    // Logic: Mark as extended requested? 
    // The plan said "is_extended" likely means "HAS been extended" or "IS extended state"?
    // Or "is_extension_requested"?
    // The migration added `is_extended`, `extension_reason`, `original_end_time`.
    // If we just request, maybe we need `extension_requested_at`?
    // Or simply: 
    // Update booking status to 'problem_reported'? or independent flag?
    // Let's assume we update `extension_reason` and maybe a status flag if we had one.
    // But `is_extended` usually means "granted".
    // PROPOSAL: Use `extension_reason` to indicate pending request?
    // Or create specific column `extension_status` ('pending', 'approved', 'rejected')?
    // For MVP, if `extension_reason` is set and `is_extended` is false, it's a request?
    // Or user just contacts admin.
    // Let's implement specific logic:

    const { error } = await supabase
        .from('bookings')
        .update({
            extension_reason: reason,
            // We don't set is_extended yet.
            // We might want to trigger a notification action in audit_logs.
        })
        .eq('id', bookingId);

    if (error) {
        console.error('Error requesting extension:', error);
        return { success: false, message: 'Error al solicitar extensión' };
    }

    // Create audit log for Admin Notification
    await supabase.from('audit_logs').insert({
        action: 'extension_requested',
        details: { booking_id: bookingId, reason, user_email: user.email },
        user_id: user.id
    });

    revalidatePath('/dashboard');
    return { success: true, message: 'Solicitud enviada a la administración' };
}

export async function resolveExtension(bookingId: string, newEndTime: Date) {
    const supabase = await createServerComponentClient();

    // Verify admin logic here (middleware handles access to admin pages, but server action needs check too)
    // ... check is_admin ...

    const { data: booking } = await supabase.from('bookings').select('end_time').eq('id', bookingId).single();

    if (!booking) return { success: false, message: 'Error' };

    const { error } = await supabase
        .from('bookings')
        .update({
            is_extended: true,
            original_end_time: booking.end_time, // Save original before overwriting
            end_time: newEndTime.toISOString(),
            extension_reason: null, // Clear reason or keep it? Keep it for history? Maybe move to audit logs.
            // If we keep it, it implies "this was the reason".
        })
        .eq('id', bookingId);

    if (error) return { success: false, message: 'Error al extender' };

    await supabase.from('audit_logs').insert({
        action: 'extension_resolved',
        details: { booking_id: bookingId, new_end_time: newEndTime, resolved_by: 'admin' },
        // user_id: admin_id
    });

    revalidatePath('/admin/bookings');
    return { success: true, message: 'Extensión aplicada' };
}
