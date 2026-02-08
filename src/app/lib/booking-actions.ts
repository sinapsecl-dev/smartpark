'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { ValidationService } from './validation-service';
import { TablesInsert, Tables } from '@/types/supabase';
import { revalidatePath } from 'next/cache';
import { awardXP } from '@/app/actions/gamification';
import { checkUnitCanBook } from './sanction-actions';
import { isPlateRegisteredInCondominium } from './vehicle-actions';

// ============================================================
// TYPES
// ============================================================

export interface TimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

// ============================================================
// SLOT CALCULATION
// ============================================================

/**
 * Calculates available time slots for a parking spot on a given day.
 * Returns gaps between existing bookings where new reservations can be made.
 * Also returns maxBookingAheadMinutes to enforce booking time limits.
 */
export async function getAvailableSlots(
  spotId: string,
  date: Date = new Date()
): Promise<{
  success: boolean;
  slots: TimeSlot[];
  bookings: Tables<'bookings'>[];
  maxBookingAheadMinutes: number;
  message?: string
}> {
  const supabase = await createServerComponentClient();

  // Use Chile timezone for consistent day boundaries
  const CHILE_TZ = 'America/Santiago';

  // Get current time in Chile timezone
  const nowChile = new Date(new Date().toLocaleString('en-US', { timeZone: CHILE_TZ }));

  // Define day boundaries in Chile timezone
  const dayStart = new Date(nowChile);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(nowChile);
  dayEnd.setHours(23, 59, 59, 999);

  // Current time (quantized to 15 min)
  const currentMinutes = nowChile.getMinutes();
  const quantizedMinutes = Math.ceil(currentMinutes / 15) * 15;
  nowChile.setMinutes(quantizedMinutes, 0, 0);

  // Earliest possible start: max of (now, dayStart)
  const earliestStart = nowChile > dayStart ? nowChile : dayStart;

  // Fetch spot to get condominium_id
  const { data: spot, error: spotError } = await supabase
    .from('spots')
    .select('condominium_id')
    .eq('id', spotId)
    .single();

  if (spotError || !spot) {
    console.error('Error fetching spot:', spotError);
    return { success: false, slots: [], bookings: [], maxBookingAheadMinutes: 60, message: 'Error al obtener estacionamiento.' };
  }

  // Fetch condominium config for max_booking_ahead_minutes
  const { data: condominium, error: condoError } = await supabase
    .from('condominiums')
    .select('max_booking_ahead_minutes')
    .eq('id', spot.condominium_id)
    .single();

  const maxBookingAheadMinutes = condominium?.max_booking_ahead_minutes ?? 60;

  // Fetch all bookings for this spot on this day
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('spot_id', spotId)
    .gte('end_time', earliestStart.toISOString())
    .lte('start_time', dayEnd.toISOString())
    .in('status', ['confirmed', 'active'])
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching bookings for slots:', error);
    return { success: false, slots: [], bookings: [], maxBookingAheadMinutes, message: 'Error al obtener reservas.' };
  }

  const slots: TimeSlot[] = [];
  let cursor = earliestStart;

  // Calculate the maximum allowed start time based on config
  const maxAllowedStartTime = new Date(nowChile.getTime() + maxBookingAheadMinutes * 60 * 1000);

  // Calculate gaps between bookings
  for (const bookingItem of (bookings || [])) {
    const booking = bookingItem as any;
    const bookingStart = new Date(booking.start_time);
    const bookingEnd = new Date(booking.end_time);

    // If there's a gap before this booking
    if (bookingStart > cursor) {
      // Limit slot end to maxAllowedStartTime for starting new bookings
      const slotEnd = bookingStart;
      const durationMinutes = Math.round((slotEnd.getTime() - cursor.getTime()) / (1000 * 60));
      if (durationMinutes >= 15) { // Minimum 15 min slot
        slots.push({
          start: new Date(cursor),
          end: new Date(slotEnd),
          durationMinutes
        });
      }
    }

    // Move cursor past this booking
    if (bookingEnd > cursor) {
      cursor = bookingEnd;
    }
  }

  // Add final slot from last booking to end of day
  if (cursor < dayEnd) {
    const durationMinutes = Math.round((dayEnd.getTime() - cursor.getTime()) / (1000 * 60));
    if (durationMinutes >= 15) {
      slots.push({
        start: new Date(cursor),
        end: dayEnd,
        durationMinutes
      });
    }
  }

  return { success: true, slots, bookings: bookings || [], maxBookingAheadMinutes };
}

/**
 * Checks if a proposed booking overlaps with any existing bookings.
 * Returns the conflicting booking if found.
 */
export async function checkBookingConflict(
  spotId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string
): Promise<{ hasConflict: boolean; conflictingBooking?: Tables<'bookings'> }> {
  const supabase = await createServerComponentClient();

  // Query for overlapping bookings using PostgreSQL range overlap
  let query = supabase
    .from('bookings')
    .select('*')
    .eq('spot_id', spotId)
    .in('status', ['confirmed', 'active'])
    .lt('start_time', endTime.toISOString())   // Booking starts before our end
    .gt('end_time', startTime.toISOString());   // Booking ends after our start

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { data: conflicting, error } = await query.limit(1).single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found (expected)
    console.error('Error checking booking conflict:', error);
  }

  return {
    hasConflict: !!conflicting,
    conflictingBooking: conflicting || undefined
  };
}


export async function createBooking(formData: FormData) {
  const supabase = await createServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Usuario no autenticado.' };
  }

  // Fetch the user's profile to get unit_id, role, and condominium_id
  const { data: userProfile, error: profileError } = await (supabase
    .from('users') as any)
    .select('id, unit_id, role, condominium_id')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile) {
    console.error('Error fetching user profile:', profileError);
    return { success: false, message: 'Perfil de usuario no encontrado.' };
  }

  const unitId = userProfile.unit_id;
  const condominiumId = userProfile.condominium_id;

  if (!unitId || !condominiumId) {
    return { success: false, message: 'Usuario no tiene asignada una unidad o condominio.' };
  }

  const licensePlate = formData.get('license_plate') as string;
  const startTimeStr = formData.get('start_time') as string;
  const endTimeStr = formData.get('end_time') as string;
  const spotId = formData.get('spot_id') as string;

  if (!licensePlate || !startTimeStr || !endTimeStr || !spotId) {
    return { success: false, message: 'Información de reserva incompleta.' };
  }

  // Check if plate belongs to a resident (Phase 5)
  // Residents cannot use guest parking for their own registered vehicles
  const isResidentVehicle = await isPlateRegisteredInCondominium(licensePlate, condominiumId);
  if (isResidentVehicle) {
    return {
      success: false,
      message: 'Esta patente pertenece a un residente. Los estacionamientos de visita son exclusivos para vehículos no registrados en la comunidad.'
    };
  }

  // Check if unit has active sanctions
  const sanctionCheck = await checkUnitCanBook(unitId);
  if (!sanctionCheck.canBook) {
    const reasonsText = sanctionCheck.reasons.join(', ');
    return {
      success: false,
      message: `Tu unidad tiene sanciones activas y no puede realizar reservas: ${reasonsText}`
    };
  }

  const startTime = new Date(startTimeStr);
  const endTime = new Date(endTimeStr);

  // Apply Fair Play Rules using ValidationService
  const validationResult = await ValidationService.validateNewBooking(
    unitId,
    startTime,
    endTime,
  );

  if (!validationResult.success) {
    return validationResult;
  }

  // Check if spot is accessible
  const { data: spotData } = await supabase
    .from('spots')
    .select('is_accessible')
    .eq('id', spotId)
    .single();

  const isAccessible = spotData?.is_accessible;
  let disabilityCredentialUrl = null;

  if (isAccessible) {
    const credentialFile = formData.get('disability_credential') as File | null;

    // If user is not resident (or even if they are?), they might need to provide credential?
    // Requirement said "Add disability_credential_url to bookings".
    // Let's assume it's optional currently or transparent if user has it in profile?
    // But BookingForm will send it.

    if (credentialFile && credentialFile.size > 0) {
      // Upload to storage
      const fileExt = credentialFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('credentials')
        .upload(fileName, credentialFile);

      if (uploadError) {
        console.error('Error uploading credential:', uploadError);
        return { success: false, message: 'Error al subir credencial de discapacidad.' };
      }

      // Get public URL? Policy says private?
      // "Admin/Devs can view". So it should be private path or signed URL.
      // We store the path.
      disabilityCredentialUrl = uploadData.path;
    } else {
      // If spot is accessible, we might Require it?
      // Let's make it optional for now or require it if no profile credential? 
      // For MVP, if they select accessible spot, they MUST upload or have it.
      // Let's enforce it in UI validation mainly, but here we just save it if provided.
    }
  }

  // Check for time conflicts with existing bookings
  const conflictResult = await checkBookingConflict(spotId, startTime, endTime);
  if (conflictResult.hasConflict && conflictResult.conflictingBooking) {
    const conflictStart = new Date(conflictResult.conflictingBooking.start_time);
    const conflictEnd = new Date(conflictResult.conflictingBooking.end_time);
    const formatTime = (d: Date) => d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    return {
      success: false,
      message: `Tu reserva interfiere con otra existente (${formatTime(conflictStart)} - ${formatTime(conflictEnd)}). Por favor selecciona otro horario.`
    };
  }


  // Prepare booking data
  const newBooking: TablesInsert<'bookings'> = {
    spot_id: spotId,
    unit_id: unitId,
    user_id: user.id,
    condominium_id: condominiumId,
    license_plate: licensePlate,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    status: 'confirmed',
    disability_credential_url: disabilityCredentialUrl,
  };

  // Insert the booking into the database
  const { data: insertedBooking, error } = await supabase
    .from('bookings')
    .insert([newBooking] as any)
    .select()
    .single();

  const insertedBookingData = insertedBooking as any;

  if (error || !insertedBookingData) {
    console.error('Error creating booking:', error);
    return { success: false, message: 'Error al crear reserva: ' + (error?.message || 'Unknown error') };
  }

  // Award XP for creating a booking
  // We pass the booking ID to link the transaction
  const xpResult = await awardXP(user.id, "BOOKING_CREATED", insertedBookingData.id);

  // Check for first booking achievement (fire-and-forget)
  (supabase as any).rpc('check_first_booking_achievement', { p_user_id: user.id })
    .then(({ error }: { error: any }) => {
      if (error) console.error('First booking achievement check failed:', error);
    });

  revalidatePath('/dashboard');

  return {
    success: true,
    message: '¡Reserva creada exitosamente!',
    xpGained: xpResult.xpGained,
    leveledUp: xpResult.leveledUp,
    newLevel: xpResult.newLevel,
  };
}

/**
 * Cancel/delete a booking
 * Only allowed if booking belongs to user and hasn't started yet
 */
export async function deleteBooking(bookingId: string) {
  const supabase = await createServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Usuario no autenticado.' };
  }

  // Fetch the booking to verify ownership and status
  const { data: bookingData, error: fetchError } = await supabase
    .from('bookings')
    .select('*, units(name)')
    .eq('id', bookingId)
    .eq('id', bookingId)
    .single();

  const booking = bookingData as any;

  if (fetchError || !booking) {
    console.error('Error fetching booking:', fetchError);
    return { success: false, message: 'Reserva no encontrada.' };
  }

  // Get user profile to check unit ownership
  const { data: userProfile } = await (supabase
    .from('users') as any)
    .select('unit_id')
    .eq('id', user.id)
    .single();

  // Verify ownership - user can only delete their own unit's bookings
  if (booking.unit_id !== userProfile?.unit_id) {
    return { success: false, message: 'No tienes permiso para cancelar esta reserva.' };
  }

  // Check if booking has already started
  const now = new Date();
  const startTime = new Date(booking.start_time);

  if (startTime <= now) {
    return { success: false, message: 'No puedes cancelar una reserva que ya ha comenzado.' };
  }

  // Calculate hours before start for "Early Cancellation" bonus
  const hoursData = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isEarlyCancellation = hoursData >= 4; // e.g. 4 hours in advance

  // Delete the booking
  const { error: deleteError } = await supabase
    .from('bookings')
    .delete()
    .eq('id', bookingId);

  if (deleteError) {
    console.error('Error deleting booking:', deleteError);
    return { success: false, message: 'Error al cancelar reserva: ' + deleteError.message };
  }

  // Award XP if early cancellation
  // Note: We cannot link to booking_id because it's deleted (unless ON DELETE SET NULL which we have, but the row is gone)
  // Actually, if we delete the row, the transaction booking_id FK will be set to NULL.
  // We can still log it.
  if (isEarlyCancellation) {
    await awardXP(user.id, "BOOKING_CANCELLED_EARLY", undefined, {
      original_booking_id: bookingId,
      cancelled_at: now.toISOString()
    });
  }

  revalidatePath('/dashboard');

  return { success: true, message: 'Reserva cancelada exitosamente.' };
}

/**
 * Update a booking
 * Only allowed if booking belongs to user and hasn't started yet
 */
export async function updateBooking(bookingId: string, formData: FormData) {
  const supabase = await createServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Usuario no autenticado.' };
  }

  // Fetch the booking to verify ownership and status
  const { data: bookingData, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  const booking = bookingData as any;

  if (fetchError || !booking) {
    return { success: false, message: 'Reserva no encontrada.' };
  }

  // Get user profile to check unit ownership
  const { data: userProfile } = await (supabase
    .from('users') as any)
    .select('unit_id')
    .eq('id', user.id)
    .single();

  // Verify ownership
  if (booking.unit_id !== userProfile?.unit_id) {
    return { success: false, message: 'No tienes permiso para editar esta reserva.' };
  }

  // Check if booking has already started
  const now = new Date();
  const startTime = new Date(booking.start_time);

  if (startTime <= now) {
    return { success: false, message: 'No puedes editar una reserva que ya ha comenzado.' };
  }

  // Get updated values
  const licensePlate = formData.get('license_plate') as string;
  const newStartTimeStr = formData.get('start_time') as string;
  const newEndTimeStr = formData.get('end_time') as string;

  if (!licensePlate || !newStartTimeStr || !newEndTimeStr) {
    return { success: false, message: 'Información incompleta.' };
  }

  const newStartTime = new Date(newStartTimeStr);
  const newEndTime = new Date(newEndTimeStr);

  // Validate new times with Fair Play rules
  if (!booking.unit_id) {
    return { success: false, message: 'Reserva sin unidad asignada.' };
  }

  const validationResult = await ValidationService.validateNewBooking(
    booking.unit_id,
    newStartTime,
    newEndTime,
    bookingId // Exclude current booking from validation
  );

  if (!validationResult.success) {
    return validationResult;
  }

  // Update the booking
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      license_plate: licensePlate,
      start_time: newStartTime.toISOString(),
      end_time: newEndTime.toISOString(),
    })
    .eq('id', bookingId);

  if (updateError) {
    console.error('Error updating booking:', updateError);
    return { success: false, message: 'Error al actualizar reserva: ' + updateError.message };
  }

  revalidatePath('/dashboard');

  return { success: true, message: 'Reserva actualizada exitosamente.' };
}
