-- Migration: Booking Time Delta Configuration
-- File: 13_booking_time_delta.sql

-- ============================================
-- ADD max_booking_ahead_minutes TO CONDOMINIUMS
-- ============================================

-- This parameter controls how far in advance users can book
-- Options: 30, 60, 90, 120, 180, 240, 480, 1440 (24h)
-- Default: 60 minutes (1 hour)

ALTER TABLE public.condominiums
ADD COLUMN IF NOT EXISTS max_booking_ahead_minutes INTEGER DEFAULT 60;

-- Add constraint to ensure valid values
ALTER TABLE public.condominiums
ADD CONSTRAINT check_max_booking_ahead_valid 
CHECK (max_booking_ahead_minutes >= 30 AND max_booking_ahead_minutes <= 1440);

-- Update existing condominium with default value
UPDATE public.condominiums 
SET max_booking_ahead_minutes = 60 
WHERE max_booking_ahead_minutes IS NULL;

-- Make column NOT NULL after setting defaults
ALTER TABLE public.condominiums
ALTER COLUMN max_booking_ahead_minutes SET NOT NULL;

-- ============================================
-- COMMENT FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN public.condominiums.max_booking_ahead_minutes IS 
'Maximum time in minutes ahead that users can book. 
Options: 30 (30min), 60 (1h), 90 (1.5h), 120 (2h), 180 (3h), 240 (4h), 480 (8h), 1440 (24h).
Default: 60 minutes.';
