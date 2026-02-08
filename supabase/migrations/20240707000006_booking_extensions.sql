-- Add extension columns to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS is_extended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS extension_reason TEXT,
ADD COLUMN IF NOT EXISTS original_end_time TIMESTAMP WITH TIME ZONE;

-- Add audit log action for extensions
-- (Assuming audit_logs check constraint allows arbitrary text or we need to add it? 
-- Usually audit_log action is text, checking previous migrations... 
-- It seems 'action' is text, or enum? 
-- 10_audit_logs.sql: "action TEXT NOT NULL". So no enum change needed.)
