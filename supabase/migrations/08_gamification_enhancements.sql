-- Migration: 08_gamification_enhancements
-- Description: Adds XP transactions log, achievements definitions, and updates award_xp function

-- ============================================
-- ACHIEVEMENTS DEFINITIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.achievements_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  xp_bonus INTEGER DEFAULT 0,
  requirement_type TEXT NOT NULL,
  requirement_value JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  display_order INTEGER DEFAULT 0,
  is_secret BOOLEAN DEFAULT false,
  category TEXT DEFAULT 'core'
);

-- Enable RLS
ALTER TABLE public.achievements_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read achievements" ON public.achievements_definitions FOR SELECT USING (true);


-- ============================================
-- XP TRANSACTIONS LOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for history lookups
CREATE INDEX idx_xp_transactions_user ON public.xp_transactions(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transactions" ON public.xp_transactions FOR SELECT USING (user_id = auth.uid());


-- ============================================
-- UPDATE AWARD_XP FUNCTION
-- ============================================
-- Drops old signature if exists (to avoid ambiguity)
DROP FUNCTION IF EXISTS public.award_xp(UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_action TEXT DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (
  new_total_xp INTEGER,
  new_level INTEGER,
  leveled_up BOOLEAN
) AS $$
DECLARE
  v_current_level INTEGER;
  v_new_level INTEGER;
  v_new_xp INTEGER;
  v_level_thresholds INTEGER[] := ARRAY[0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250];
BEGIN
  -- Log the transaction
  INSERT INTO public.xp_transactions (user_id, action_type, xp_amount, booking_id, metadata)
  VALUES (p_user_id, p_action, p_xp_amount, p_booking_id, p_metadata);

  -- Get current values and update XP
  -- Create row if not exists (safety check, though trigger should have handled it)
  INSERT INTO public.user_experience (user_id, total_xp, level)
  VALUES (p_user_id, 0, 1)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_experience
  SET 
    total_xp = total_xp + p_xp_amount,
    last_xp_gained_at = NOW()
  WHERE user_id = p_user_id
  RETURNING total_xp, level INTO v_new_xp, v_current_level;
  
  -- Calculate new level based on XP thresholds
  v_new_level := 1;
  FOR i IN REVERSE 10..1 LOOP
    IF v_new_xp >= v_level_thresholds[i] THEN
      v_new_level := i;
      EXIT;
    END IF;
  END LOOP;
  
  -- Update level if changed
  IF v_new_level > v_current_level THEN
    UPDATE public.user_experience
    SET level = v_new_level
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN QUERY SELECT v_new_xp, v_new_level, v_new_level > v_current_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
