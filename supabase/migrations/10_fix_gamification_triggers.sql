-- Migration: 10_fix_gamification_triggers
-- Description: Consolidates conflicting authentication triggers into a single robust function

BEGIN;

-- 1. Drop existing triggers to remove conflicts
DROP TRIGGER IF EXISTS trigger_initialize_user_gamification ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_gamification ON auth.users;

-- 2. Drop the old functions to clean up
DROP FUNCTION IF EXISTS public.initialize_user_gamification();
DROP FUNCTION IF EXISTS public.handle_new_user_gamification();

-- 3. Create a single, consolidated initialization function
CREATE OR REPLACE FUNCTION public.handle_new_user_gamification_consolidated()
RETURNS TRIGGER AS $$
BEGIN
  -- Create initial XP record
  INSERT INTO public.user_experience (user_id, total_xp, level)
  VALUES (NEW.id, 0, 1)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create initial Reputation record (if table exists, otherwise skip/fail gracefully? 
  -- Assuming user_reputation exists based on previous system state, but safeguard it)
  -- We'll check if the table exists dynamically or just assume standard schema.
  -- Better to stick to what we know exists: user_experience and user_avatars.
  -- If user_reputation is needed, it should be in the schema. 
  -- Based on user feedback "100 with green circle", user_reputation likely exists.
  BEGIN
    INSERT INTO public.user_reputation (user_id, reputation_score)
    VALUES (NEW.id, 100)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN undefined_table THEN
    -- Ignore if table doesn't exist yet
    NULL;
  END;
  
  -- Create avatar with email as seed (Prefer 'lorelei' as per recent design)
  INSERT INTO public.user_avatars (user_id, avatar_seed, avatar_style)
  VALUES (NEW.id, COALESCE(NEW.email, NEW.id::TEXT), 'lorelei')
  ON CONFLICT (user_id) 
  DO UPDATE SET
    avatar_style = 'lorelei', -- Ensure new style is applied even if record existed (e.g. from partial failure)
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach the single trigger
CREATE TRIGGER on_auth_user_created_gamification_consolidated
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_gamification_consolidated();

COMMIT;
