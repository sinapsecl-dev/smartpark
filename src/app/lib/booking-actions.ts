'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { ValidationService } from './validation-service';
import { TablesInsert } from '@/types/supabase';
import { revalidatePath } from 'next/cache';

export async function createBooking(formData: FormData) {
  const supabase = await createServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Usuario no autenticado.' };
  }

  // Fetch the user's profile to get unit_id and role
  const { data: userProfile, error: profileError } = await (supabase
    .from('users') as any)
    .select('id, unit_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile) {
    console.error('Error fetching user profile:', profileError);
    return { success: false, message: 'Perfil de usuario no encontrado.' };
  }

  const unitId = userProfile.unit_id;
  if (!unitId) {
    return { success: false, message: 'Usuario no asignado a una unidad.' };
  }

  const licensePlate = formData.get('license_plate') as string;
  const startTimeStr = formData.get('start_time') as string;
  const endTimeStr = formData.get('end_time') as string;
  const spotId = formData.get('spot_id') as string;

  if (!licensePlate || !startTimeStr || !endTimeStr || !spotId) {
    return { success: false, message: 'Información de reserva incompleta.' };
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

  // Prepare booking data
  const newBooking: TablesInsert<'bookings'> = {
    spot_id: spotId,
    unit_id: unitId,
    user_id: user.id,
    license_plate: licensePlate,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    status: 'confirmed',
  };

  // Insert the booking into the database
  const { error } = await supabase.from('bookings').insert([newBooking] as any);

  if (error) {
    console.error('Error creating booking:', error);
    return { success: false, message: 'Error al crear reserva: ' + error.message };
  }

  revalidatePath('/dashboard');

  return { success: true, message: '¡Reserva creada exitosamente!' };
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
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*, units(name)')
    .eq('id', bookingId)
    .single();

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

  // Delete the booking
  const { error: deleteError } = await supabase
    .from('bookings')
    .delete()
    .eq('id', bookingId);

  if (deleteError) {
    console.error('Error deleting booking:', deleteError);
    return { success: false, message: 'Error al cancelar reserva: ' + deleteError.message };
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
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

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
