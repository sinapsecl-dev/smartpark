import { createServerComponentClient } from '@/lib/supabase/server'; // Use the server-side client
import { Tables, Enums } from '@/types/supabase'; // Import generated types

const MAX_BOOKING_DURATION_HOURS = 4;
const MIN_BOOKING_DURATION_MINUTES = 15;
const COOLDOWN_PERIOD_HOURS = 2; // 2-hour cooldown between bookings
const WEEKLY_QUOTA_HOURS = 15; // From knowledge_base.md

type Booking = Tables<'bookings'>;
type Unit = Tables<'units'>;

export class ValidationService {
  /**
   * Validates if the proposed booking duration is within acceptable limits (15m - 4h).
   * @param startTime The start time of the booking.
   * @param endTime The end time of the booking.
   * @returns True if duration is valid, false otherwise.
   */
  static validateBookingDuration(startTime: Date, endTime: Date): boolean {
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    return (
      durationMinutes >= MIN_BOOKING_DURATION_MINUTES &&
      durationMinutes <= MAX_BOOKING_DURATION_HOURS * 60 &&
      durationMinutes % MIN_BOOKING_DURATION_MINUTES === 0 // Ensure 15-minute intervals
    );
  }

  /**
   * Checks if adding proposedDurationMinutes exceeds the weekly quota for the unit.
   * @param unitId The ID of the unit.
   * @param proposedDurationMinutes The duration of the new booking in minutes.
   * @returns True if quota is not exceeded, false otherwise.
   */
  static async checkWeeklyQuota(unitId: string, proposedDurationMinutes: number): Promise<boolean> {
    const supabase = await createServerComponentClient(); // Initialize Supabase client
    const { data: unit, error } = await (supabase
      .from('units') as any) // Add 'as any' here
      .select('weekly_quota_hours, current_week_usage_minutes')
      .eq('id', unitId)
      .single();

    if (error) {
      console.error('Error fetching unit for quota check:', error);
      return false;
    }

    if (!unit) {
      return false; // Unit not found
    }

    const currentUsageHours = unit.current_week_usage_minutes / 60;
    const proposedUsageHours = proposedDurationMinutes / 60;
    const totalUsageHours = currentUsageHours + proposedUsageHours;

    return totalUsageHours <= unit.weekly_quota_hours;
  }

  /**
   * Checks if the proposedStartTime respects the cooldown period since the last booking for the unit.
   * @param unitId The ID of the unit.
   * @param proposedStartTime The proposed start time of the new booking.
   * @param excludeBookingId Optional booking ID to exclude from the check (useful for updates).
   * @returns True if cooldown is respected, false otherwise.
   */
  static async checkCooldownPeriod(unitId: string, proposedStartTime: Date, excludeBookingId?: string): Promise<boolean> {
    const supabase = await createServerComponentClient(); // Initialize Supabase client
    let query = supabase.from('bookings')
      .select('end_time')
      .eq('unit_id', unitId);

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data: lastBooking, error } = await query
      .order('end_time', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching last booking for cooldown check:', error);
      return false;
    }

    if (!lastBooking || !lastBooking.end_time) {
      return true; // No previous booking, so no cooldown applies
    }

    const lastBookingEndTime = new Date(lastBooking.end_time);
    const cooldownEndDate = new Date(lastBookingEndTime.getTime() + COOLDOWN_PERIOD_HOURS * 60 * 60 * 1000);

    return proposedStartTime.getTime() >= cooldownEndDate.getTime();
  }

  /**
   * Checks if the unit is marked as 'delinquent'.
   * @param unitId The ID of the unit.
   * @returns True if the unit is NOT delinquent, false if it is.
   */
  static async checkDelinquencyStatus(unitId: string): Promise<boolean> {
    const supabase = await createServerComponentClient(); // Initialize Supabase client
    const { data: unit, error } = await (supabase // Add 'as any' here
      .from('units') as any)
      .select('status')
      .eq('id', unitId)
      .single();

    if (error) {
      console.error('Error fetching unit status for delinquency check:', error);
      return false;
    }

    if (!unit) {
      return false; // Unit not found
    }

    return unit.status !== 'delinquent';
  }

  /**
   * Orchestrates all validation checks for a new or updated booking.
   * @param unitId The ID of the unit attempting to make the booking.
   * @param startTime The proposed start time of the booking.
   * @param endTime The proposed end time of the booking.
   * @param excludeBookingId Optional booking ID to exclude from validation (for updates).
   * @returns True if all validations pass, false otherwise.
   */
  static async validateNewBooking(
    unitId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string
  ): Promise<{ success: boolean; message?: string }> {
    if (!ValidationService.validateBookingDuration(startTime, endTime)) {
      return { success: false, message: 'Duración inválida (mín. 15min, máx. 4h, intervalos de 15min).' };
    }

    if (!(await ValidationService.checkDelinquencyStatus(unitId))) {
      return { success: false, message: 'La unidad está en mora y no puede hacer reservas.' };
    }

    const proposedDurationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    if (!(await ValidationService.checkWeeklyQuota(unitId, proposedDurationMinutes))) {
      return { success: false, message: `Cuota semanal de ${WEEKLY_QUOTA_HOURS} horas excedida.` };
    }

    if (!(await ValidationService.checkCooldownPeriod(unitId, startTime, excludeBookingId))) {
      return { success: false, message: `Período de enfriamiento de ${COOLDOWN_PERIOD_HOURS} horas no respetado. Debes esperar antes de hacer otra reserva.` };
    }

    return { success: true };
  }
}
