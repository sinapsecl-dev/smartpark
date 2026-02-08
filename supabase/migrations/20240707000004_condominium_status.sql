-- Add status column to condominiums
ALTER TABLE public.condominiums 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended'));
