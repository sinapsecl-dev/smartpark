-- Migration: 06_gamification
-- Description: XP system, achievements, and avatar customization tables

-- ============================================
-- USER EXPERIENCE (XP & LEVELS)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_xp INTEGER DEFAULT 0 CHECK (total_xp >= 0),
  level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 10),
  last_xp_gained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for leaderboard queries (top users by XP)
CREATE INDEX idx_user_experience_leaderboard 
  ON public.user_experience(total_xp DESC, level DESC);

-- Index for user lookup (most common query)
CREATE INDEX idx_user_experience_user 
  ON public.user_experience(user_id);

-- Enable RLS
ALTER TABLE public.user_experience ENABLE ROW LEVEL SECURITY;

-- Users can view their own XP
CREATE POLICY "Users can view own experience"
  ON public.user_experience FOR SELECT
  USING (user_id = auth.uid());

-- Public leaderboard access (read-only, limited data exposure)
CREATE POLICY "Public leaderboard access"
  ON public.user_experience FOR SELECT
  USING (true);

-- Only server-side can update XP (prevents cheating)
CREATE POLICY "Service role can update experience"
  ON public.user_experience FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- USER ACHIEVEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0),
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- One achievement per user
  CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

-- Index for user's achievements lookup
CREATE INDEX idx_user_achievements_user 
  ON public.user_achievements(user_id);

-- Index for finding who has specific achievement
CREATE INDEX idx_user_achievements_achievement 
  ON public.user_achievements(achievement_id) 
  WHERE unlocked_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can view their own achievements
CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  USING (user_id = auth.uid());

-- Only server-side can update achievements
CREATE POLICY "Service role can manage achievements"
  ON public.user_achievements FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- USER AVATARS (DiceBear)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  avatar_seed TEXT NOT NULL, -- Email or UUID as seed
  avatar_style TEXT DEFAULT 'lorelei', -- DiceBear style
  selected_accessories JSONB DEFAULT '{}', -- Future customization
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for user lookup
CREATE INDEX idx_user_avatars_user 
  ON public.user_avatars(user_id);

-- Enable RLS
ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;

-- Users can view all avatars (for leaderboard/profile display)
CREATE POLICY "Public avatar access"
  ON public.user_avatars FOR SELECT
  USING (true);

-- Users can update only their own avatar
CREATE POLICY "Users can update own avatar"
  ON public.user_avatars FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own avatar"
  ON public.user_avatars FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION public.update_gamification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_user_experience_timestamp
  BEFORE UPDATE ON public.user_experience
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gamification_timestamp();

CREATE TRIGGER trigger_update_user_avatars_timestamp
  BEFORE UPDATE ON public.user_avatars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gamification_timestamp();

-- ============================================
-- FUNCTION: Initialize user gamification data
-- Called when new user is created
-- ============================================
CREATE OR REPLACE FUNCTION public.initialize_user_gamification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create initial XP record
  INSERT INTO public.user_experience (user_id, total_xp, level)
  VALUES (NEW.id, 0, 1);
  
  -- Create avatar with email as seed
  INSERT INTO public.user_avatars (user_id, avatar_seed, avatar_style)
  VALUES (NEW.id, COALESCE(NEW.email, NEW.id::TEXT), 'lorelei');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create gamification data for new users
CREATE TRIGGER trigger_initialize_user_gamification
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_gamification();

-- ============================================
-- FUNCTION: Award XP to user
-- ============================================
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_action TEXT DEFAULT NULL
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
  -- Get current values and update XP
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

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.user_experience IS 'XP and level progression for gamification';
COMMENT ON TABLE public.user_achievements IS 'User achievement progress and unlocks';
COMMENT ON TABLE public.user_avatars IS 'DiceBear avatar customization per user';
COMMENT ON FUNCTION public.award_xp IS 'Awards XP to user and calculates level ups';
