-- Migration: 11_first_login_achievement
-- Description: Add new achievements including first login trigger for immediate user engagement

BEGIN;

-- 1. Insert new achievement definitions (Spanish)
INSERT INTO achievements_definitions (id, name, description, icon, xp_bonus, requirement_type, requirement_value, display_order, is_secret, category)
VALUES 
  ('first_login', 'Bienvenido a SinaPark', 'Iniciaste sesión por primera vez', '🎉', 15, 'first_login', '{"count": 1}', 0, false, 'core'),
  ('profile_complete', 'Perfil Completo', 'Completaste toda la información de tu perfil', '✨', 30, 'profile_completed', '{"count": 1}', 9, false, 'core'),
  ('booking_explorer_10', 'Explorador', 'Realizaste 10 reservas', '🗺️', 75, 'bookings_completed', '{"count": 10}', 10, false, 'consistency')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  xp_bonus = EXCLUDED.xp_bonus,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  display_order = EXCLUDED.display_order;

-- 2. Add first_login_at column to users table if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Create function to check and award first login achievement
CREATE OR REPLACE FUNCTION public.check_first_login_achievement(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_already_unlocked BOOLEAN;
  v_first_login TIMESTAMPTZ;
BEGIN
  -- Check if already unlocked
  SELECT EXISTS(
    SELECT 1 FROM user_achievements 
    WHERE user_id = p_user_id AND achievement_id = 'first_login'
  ) INTO v_already_unlocked;
  
  IF v_already_unlocked THEN
    RETURN FALSE;
  END IF;
  
  -- Check if this is first login (first_login_at is NULL)
  SELECT first_login_at INTO v_first_login FROM public.users WHERE id = p_user_id;
  
  IF v_first_login IS NULL THEN
    -- Mark first login
    UPDATE public.users SET first_login_at = NOW() WHERE id = p_user_id;
    
    -- Award the achievement
    INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
    VALUES (p_user_id, 'first_login', 100, NOW())
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
    
    -- Award XP for first login (15 XP)
    -- We use the award_xp function if it exists, otherwise manual insert
    PERFORM award_xp(p_user_id, 15, 'FIRST_LOGIN', NULL, '{}'::jsonb);
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to check profile completion achievement
CREATE OR REPLACE FUNCTION public.check_profile_complete_achievement(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_already_unlocked BOOLEAN;
  v_profile_complete BOOLEAN;
BEGIN
  -- Check if already unlocked
  SELECT EXISTS(
    SELECT 1 FROM user_achievements 
    WHERE user_id = p_user_id AND achievement_id = 'profile_complete'
  ) INTO v_already_unlocked;
  
  IF v_already_unlocked THEN
    RETURN FALSE;
  END IF;
  
  -- Check if profile is complete
  SELECT profile_completed INTO v_profile_complete FROM public.users WHERE id = p_user_id;
  
  IF v_profile_complete = TRUE THEN
    -- Award the achievement
    INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
    VALUES (p_user_id, 'profile_complete', 100, NOW())
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
    
    -- Award XP (30 XP)
    PERFORM award_xp(p_user_id, 30, 'PROFILE_COMPLETED', NULL, '{}'::jsonb);
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
