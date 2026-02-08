-- Add is_accessible to spots
ALTER TABLE public.spots 
ADD COLUMN is_accessible BOOLEAN DEFAULT FALSE;

-- Add disability_credential_url to bookings
ALTER TABLE public.bookings
ADD COLUMN disability_credential_url TEXT;

-- Storage Bucket for Credentials
-- Note: This is usually done via API or UI, but can be done via SQL if extension is enabled.
-- We will assume bucket 'credentials' exists or create it via UI policy.
-- Insert into storage.buckets (id, name, public) VALUES ('credentials', 'credentials', false);

-- RLS for spots (Already exists, but check if we need special policies for accessible spots?)
-- No, logic will be in application layer.

-- RLS for bookings (Already exists).
