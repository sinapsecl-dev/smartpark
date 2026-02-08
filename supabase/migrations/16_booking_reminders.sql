-- Migration: 16_booking_reminders
-- Description: Add reminder_sent column to bookings to track 15-min warning

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.bookings.reminder_sent IS 'Flag to indicate if the 15-minute expiration reminder has been sent';
