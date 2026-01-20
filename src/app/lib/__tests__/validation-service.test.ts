import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationService } from '../validation-service';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createClientComponentClient } from '@/lib/supabase/client';
// import { WEEKLY_QUOTA_HOURS } from '../validation-service'; // Import the constant (Removed as it is now in the DB)

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  single: vi.fn(),
};

// Mock the createServerComponentClient and createClientComponentClient
vi.mock('@/lib/supabase/server', () => ({
  createServerComponentClient: vi.fn(() => mockSupabase),
}));
vi.mock('@/lib/supabase/client', () => ({
  createClientComponentClient: vi.fn(() => mockSupabase),
}));

describe('ValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test for validateBookingDuration
  describe('validateBookingDuration', () => {
    it('should return true for valid duration (15m to 4h, 15m interval)', () => {
      const startTime = new Date('2026-01-14T10:00:00Z');
      const endTime = new Date('2026-01-14T10:15:00Z'); // 15 minutes
      expect(ValidationService.validateBookingDuration(startTime, endTime)).toBe(true);

      const endTime2 = new Date('2026-01-14T14:00:00Z'); // 4 hours
      expect(ValidationService.validateBookingDuration(startTime, endTime2)).toBe(true);
    });

    it('should return false for duration less than 15 minutes', () => {
      const startTime = new Date('2026-01-14T10:00:00Z');
      const endTime = new Date('2026-01-14T10:10:00Z'); // 10 minutes
      expect(ValidationService.validateBookingDuration(startTime, endTime)).toBe(false);
    });

    it('should return false for duration greater than 4 hours', () => {
      const startTime = new Date('2026-01-14T10:00:00Z');
      const endTime = new Date('2026-01-14T14:15:00Z'); // 4 hours 15 minutes
      expect(ValidationService.validateBookingDuration(startTime, endTime)).toBe(false);
    });

    it('should return false for duration not in 15-minute intervals', () => {
      const startTime = new Date('2026-01-14T10:00:00Z');
      const endTime = new Date('2026-01-14T10:20:00Z'); // 20 minutes
      expect(ValidationService.validateBookingDuration(startTime, endTime)).toBe(false);
    });

    it('should return false for end time before start time', () => {
      const startTime = new Date('2026-01-14T10:15:00Z');
      const endTime = new Date('2026-01-14T10:00:00Z');
      expect(ValidationService.validateBookingDuration(startTime, endTime)).toBe(false);
    });
  });

  // Test for checkWeeklyQuota
  describe('checkWeeklyQuota', () => {
    const unitId = 'test-unit-id';

    it('should return true if quota is not exceeded', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { weekly_quota_hours: 15, current_week_usage_minutes: 0 },
        error: null,
      });
      await expect(ValidationService.checkWeeklyQuota(unitId, 60)).resolves.toBe(true); // 1 hour
    });

    it('should return false if quota is exceeded', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { weekly_quota_hours: 15, current_week_usage_minutes: 14 * 60 }, // 14 hours used
        error: null,
      });
      await expect(ValidationService.checkWeeklyQuota(unitId, 120)).resolves.toBe(false); // Add 2 hours (total 16)
    });

    it('should return true if quota is exactly met', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { weekly_quota_hours: 15, current_week_usage_minutes: 14 * 60 }, // 14 hours used
        error: null,
      });
      await expect(ValidationService.checkWeeklyQuota(unitId, 60)).resolves.toBe(true); // Add 1 hour (total 15)
    });

    it('should return false if unit not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
      await expect(ValidationService.checkWeeklyQuota(unitId, 60)).resolves.toBe(false);
    });

    it('should return false on error fetching unit', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: new Error('DB error') });
      await expect(ValidationService.checkWeeklyQuota(unitId, 60)).resolves.toBe(false);
    });
  });

  // Test for checkCooldownPeriod
  describe('checkCooldownPeriod', () => {
    const unitId = 'test-unit-id';
    const twoHours = 2 * 60 * 60 * 1000;

    it('should return true if no previous booking exists', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }, // Supabase error for no rows
      });
      const proposedStartTime = new Date();
      await expect(ValidationService.checkCooldownPeriod(unitId, proposedStartTime)).resolves.toBe(true);
    });

    it('should return true if cooldown period is respected', async () => {
      const lastBookingEndTime = new Date('2026-01-14T10:00:00Z');
      mockSupabase.single.mockResolvedValueOnce({
        data: { end_time: lastBookingEndTime.toISOString() },
        error: null,
      });
      const proposedStartTime = new Date(lastBookingEndTime.getTime() + twoHours + 1000); // Just over 2 hours later
      await expect(ValidationService.checkCooldownPeriod(unitId, proposedStartTime)).resolves.toBe(true);
    });

    it('should return false if cooldown period is not respected', async () => {
      const lastBookingEndTime = new Date('2026-01-14T10:00:00Z');
      mockSupabase.single.mockResolvedValueOnce({
        data: { end_time: lastBookingEndTime.toISOString() },
        error: null,
      });
      const proposedStartTime = new Date(lastBookingEndTime.getTime() + twoHours - 1000); // Just under 2 hours later
      await expect(ValidationService.checkCooldownPeriod(unitId, proposedStartTime)).resolves.toBe(false);
    });

    it('should return false on error fetching last booking', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: new Error('DB error') });
      const proposedStartTime = new Date();
      await expect(ValidationService.checkCooldownPeriod(unitId, proposedStartTime)).resolves.toBe(false);
    });
  });

  // Test for checkDelinquencyStatus
  describe('checkDelinquencyStatus', () => {
    const unitId = 'test-unit-id';

    it('should return true if unit is active', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { status: 'active' }, error: null });
      await expect(ValidationService.checkDelinquencyStatus(unitId)).resolves.toBe(true);
    });

    it('should return false if unit is delinquent', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { status: 'delinquent' }, error: null });
      await expect(ValidationService.checkDelinquencyStatus(unitId)).resolves.toBe(false);
    });

    it('should return false if unit not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
      await expect(ValidationService.checkDelinquencyStatus(unitId)).resolves.toBe(false);
    });

    it('should return false on error fetching unit status', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: new Error('DB error') });
      await expect(ValidationService.checkDelinquencyStatus(unitId)).resolves.toBe(false);
    });
  });

  // Test for validateNewBooking (orchestration)
  describe('validateNewBooking', () => {
    const unitId = 'test-unit-id';
    const validStartTime = new Date('2026-01-14T10:00:00Z');
    const validEndTime = new Date('2026-01-14T11:00:00Z'); // 1 hour

    beforeEach(() => {
      // Default mocks for a successful scenario
      mockSupabase.from.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.order.mockReturnThis();
      mockSupabase.limit.mockReturnThis();
      // Use mockImplementation to differentiate calls based on table name
      mockSupabase.single.mockImplementation(async () => {
        const tableName = (mockSupabase.from as any).mock.lastCall?.[0]; // Get the table name from the last .from() call

        if (tableName === 'units') {
          return {
            data: { weekly_quota_hours: 15, current_week_usage_minutes: 0, status: 'active' },
            error: null,
          };
        }
        if (tableName === 'bookings') {
          return {
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' }, // No previous booking
          };
        }
        return { data: null, error: null };
      });
    });


    it('should return success true for a valid booking', async () => {
      // Mock for checkDelinquencyStatus
      mockSupabase.single.mockResolvedValueOnce({
        data: { status: 'active' },
        error: null,
      });
      // Mock for checkWeeklyQuota
      mockSupabase.single.mockResolvedValueOnce({
        data: { weekly_quota_hours: 15, current_week_usage_minutes: 0 },
        error: null,
      });
      // Mock for checkCooldownPeriod
      mockSupabase.single.mockResolvedValueOnce({
        data: null, // No previous booking
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await ValidationService.validateNewBooking(unitId, validStartTime, validEndTime);
      expect(result.success).toBe(true);
    });

    it('should return success false if booking duration is invalid', async () => {
      const invalidEndTime = new Date('2026-01-14T10:05:00Z'); // 5 minutes
      const result = await ValidationService.validateNewBooking(unitId, validStartTime, invalidEndTime);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Booking duration is invalid');
    });

    it('should return success false if unit is delinquent', async () => {
      // Mock for checkDelinquencyStatus
      mockSupabase.single.mockResolvedValueOnce({
        data: { status: 'delinquent' },
        error: null,
      });

      const result = await ValidationService.validateNewBooking(unitId, validStartTime, validEndTime);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unit is delinquent');
    });

    it('should return success false if weekly quota is exceeded', async () => {
      // Mock for checkDelinquencyStatus (pass)
      mockSupabase.single.mockResolvedValueOnce({
        data: { status: 'active' },
        error: null,
      });
      // Mock for checkWeeklyQuota (fail)
      mockSupabase.single.mockResolvedValueOnce({
        data: { weekly_quota_hours: 15, current_week_usage_minutes: 14 * 60 }, // 14 hours used
        error: null,
      });

      const result = await ValidationService.validateNewBooking(unitId, validStartTime, new Date(validStartTime.getTime() + 2 * 60 * 60 * 1000)); // Add 2 hours (total 16)
      expect(result.success).toBe(false);
      expect(result.message).toContain('Weekly quota of 15 hours exceeded');
    });

    it('should return success false if cooldown period is not respected', async () => {
      const lastBookingEndTime = new Date('2026-01-14T09:00:00Z');
      // Mock for checkDelinquencyStatus (pass)
      mockSupabase.single.mockResolvedValueOnce({
        data: { status: 'active' },
        error: null,
      });
      // Mock for checkWeeklyQuota (pass)
      mockSupabase.single.mockResolvedValueOnce({
        data: { weekly_quota_hours: 15, current_week_usage_minutes: 0 },
        error: null,
      });
      // Mock for checkCooldownPeriod (fail)
      mockSupabase.single.mockResolvedValueOnce({
        data: { end_time: lastBookingEndTime.toISOString() },
        error: null,
      });

      const proposedStartTime = new Date(lastBookingEndTime.getTime() + 1 * 60 * 60 * 1000); // 1 hour later (violates 2h cooldown)
      const proposedEndTime = new Date(proposedStartTime.getTime() + 15 * 60 * 1000);
      const result = await ValidationService.validateNewBooking(unitId, proposedStartTime, proposedEndTime);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Cooldown period of 2 hours not respected');
    });
  });
});
