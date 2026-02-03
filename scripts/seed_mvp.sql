-- CLEANUP DATA
-- Removes all transactional data but keeps configuration and definitions
TRUNCATE TABLE public.bookings CASCADE;
TRUNCATE TABLE public.audit_logs CASCADE;
TRUNCATE TABLE public.infractions CASCADE;
TRUNCATE TABLE public.user_experience CASCADE;
TRUNCATE TABLE public.user_achievements CASCADE;
-- Do not truncate user_avatars if we want to keep user seeds? 
-- actually, if we delete data, we should probably clear connected data.
TRUNCATE TABLE public.user_avatars CASCADE;

-- CLEAN UNITS (Keep Spots)
DELETE FROM public.units;

-- SEED UNITS (Casa 1 to Casa 95)
DO $$
DECLARE
  v_condo_id UUID;
BEGIN
  -- 1. Get the Condominium ID
  SELECT id INTO v_condo_id FROM public.condominiums WHERE name = 'Terrazas del Sol V' LIMIT 1;
  
  -- 2. Fallback if not found (default migration ID)
  IF v_condo_id IS NULL THEN
     v_condo_id := 'a0000000-0000-0000-0000-000000000001';
  END IF;

  -- 3. Insert Units with Condo ID
  FOR i IN 1..95 LOOP
    INSERT INTO public.units (name, status, weekly_quota_hours, condominium_id) 
    VALUES ('Casa ' || i, 'active', 15, v_condo_id);
  END LOOP;
END $$;
