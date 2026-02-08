-- 15_unit_vehicles.sql

CREATE TABLE IF NOT EXISTS public.unit_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  license_plate TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'car', -- car, suv, motorcycle, truck, other
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  UNIQUE(unit_id, license_plate)
);

CREATE INDEX IF NOT EXISTS idx_unit_vehicles_plate ON public.unit_vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_unit_vehicles_unit ON public.unit_vehicles(unit_id);

-- Add configuration to condominiums
ALTER TABLE public.condominiums
ADD COLUMN IF NOT EXISTS max_vehicles_per_unit INTEGER DEFAULT 3;

-- Enable RLS
ALTER TABLE public.unit_vehicles ENABLE ROW LEVEL SECURITY;

-- Policies

-- Residents can view their own unit's vehicles
CREATE POLICY "Residents can view their own unit vehicles"
  ON public.unit_vehicles
  FOR SELECT
  USING (
    unit_id IN (
        SELECT unit_id FROM public.users
        WHERE id = auth.uid()
    )
  );

-- Admins can view all (Phase 1 will add developer)
CREATE POLICY "Admins view all vehicles"
  ON public.unit_vehicles
  FOR SELECT
  USING (
    public.is_admin()
  );

-- Residents can insert their own unit vehicles
-- Validation of limit is done in app logic or trigger (Phase 1/5)
CREATE POLICY "Residents can insert their own unit vehicles"
  ON public.unit_vehicles
  FOR INSERT
  WITH CHECK (
    unit_id IN (
        SELECT unit_id FROM public.users
        WHERE id = auth.uid()
    )
  );

-- Residents can delete their own vehicles
CREATE POLICY "Residents can delete their own unit vehicles"
  ON public.unit_vehicles
  FOR DELETE
  USING (
    unit_id IN (
        SELECT unit_id FROM public.users
        WHERE id = auth.uid()
    )
  );
  
-- Admins can manage everything
CREATE POLICY "Admins manage vehicles"
  ON public.unit_vehicles
  FOR ALL
  USING ( public.is_admin() );
