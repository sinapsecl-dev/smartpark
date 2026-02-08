-- Migration: Unit Sanctions System
-- File: 14_unit_sanctions.sql

-- ============================================
-- SANCTION TYPE ENUM
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sanction_type') THEN
    CREATE TYPE public.sanction_type AS ENUM ('fine', 'debt', 'fee', 'other');
  END IF;
END $$;

-- ============================================
-- UNIT SANCTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.unit_sanctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  sanction_type public.sanction_type NOT NULL,
  reason TEXT,
  amount DECIMAL(10, 2), -- Optional amount for fines/debts
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE, -- NULL = indefinite
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  lifted_by UUID REFERENCES public.users(id),
  lifted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

-- Fast lookup for active sanctions by unit
CREATE INDEX IF NOT EXISTS idx_unit_sanctions_active 
ON public.unit_sanctions(unit_id, is_active) 
WHERE is_active = true;

-- Condominium-level queries
CREATE INDEX IF NOT EXISTS idx_unit_sanctions_condominium 
ON public.unit_sanctions(condominium_id);

-- Expiration queries for cron job
CREATE INDEX IF NOT EXISTS idx_unit_sanctions_expiration 
ON public.unit_sanctions(ends_at) 
WHERE is_active = true AND ends_at IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.unit_sanctions ENABLE ROW LEVEL SECURITY;

-- Admins can view sanctions in their condominium
CREATE POLICY "Admins can view sanctions in their condominium"
ON public.unit_sanctions FOR SELECT
USING (
  condominium_id = public.get_user_condominium_id()
  AND public.is_admin()
);

-- Admins can create sanctions
CREATE POLICY "Admins can create sanctions"
ON public.unit_sanctions FOR INSERT
WITH CHECK (
  condominium_id = public.get_user_condominium_id()
  AND public.is_admin()
);

-- Admins can update sanctions (for lifting)
CREATE POLICY "Admins can update sanctions"
ON public.unit_sanctions FOR UPDATE
USING (
  condominium_id = public.get_user_condominium_id()
  AND public.is_admin()
);

-- Service role policy for cron job
CREATE POLICY "Service role can manage all sanctions"
ON public.unit_sanctions FOR ALL
USING (auth.role() = 'service_role');

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE TRIGGER set_updated_at_unit_sanctions
  BEFORE UPDATE ON public.unit_sanctions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.unit_sanctions IS 'Stores sanctions/blocks applied to units that prevent booking';
COMMENT ON COLUMN public.unit_sanctions.sanction_type IS 'Type of sanction: fine (multa), debt (deuda), fee (gastos comunes), other';
COMMENT ON COLUMN public.unit_sanctions.ends_at IS 'When sanction expires. NULL means indefinite until manually lifted';
COMMENT ON COLUMN public.unit_sanctions.amount IS 'Optional monetary amount for fines or debts';
