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
BEGIN
  FOR i IN 1..95 LOOP
    INSERT INTO public.units (name, status, weekly_quota_hours) 
    VALUES ('Casa ' || i, 'active', 15);
  END LOOP;
END $$;
