-- Migration: 07_reputation
-- Description: Community reputation system for tracking user behavior

-- ============================================
-- USER REPUTATION
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Main reputation score (0-100)
  reputation_score INTEGER DEFAULT 100 
    CHECK (reputation_score >= 0 AND reputation_score <= 100),
  
  -- Component metrics
  total_reports_made INTEGER DEFAULT 0,
  valid_reports INTEGER DEFAULT 0,
  invalid_reports INTEGER DEFAULT 0,
  infractions_count INTEGER DEFAULT 0,
  on_time_percentage DECIMAL(5,2) DEFAULT 100.00 
    CHECK (on_time_percentage >= 0 AND on_time_percentage <= 100),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for leaderboard (high reputation first)
CREATE INDEX idx_user_reputation_score 
  ON public.user_reputation(reputation_score DESC);

-- Index for user lookup
CREATE INDEX idx_user_reputation_user 
  ON public.user_reputation(user_id);

-- Enable RLS
ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;

-- Public read access for leaderboards
CREATE POLICY "Public reputation view"
  ON public.user_reputation FOR SELECT
  USING (true);

-- Only server-side can update reputation
CREATE POLICY "Service role can update reputation"
  ON public.user_reputation FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE TRIGGER trigger_update_user_reputation_timestamp
  BEFORE UPDATE ON public.user_reputation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gamification_timestamp();

-- ============================================
-- FUNCTION: Initialize user reputation
-- Called by the same trigger as gamification
-- ============================================
CREATE OR REPLACE FUNCTION public.initialize_user_reputation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_reputation (user_id, reputation_score)
  VALUES (NEW.id, 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add to existing user creation trigger
CREATE TRIGGER trigger_initialize_user_reputation
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_reputation();

-- ============================================
-- FUNCTION: Update reputation score
-- Recalculates based on component metrics
-- ============================================
CREATE OR REPLACE FUNCTION public.update_reputation_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_infractions INTEGER;
  v_on_time_pct DECIMAL;
  v_invalid_reports INTEGER;
  v_new_score INTEGER;
BEGIN
  -- Get current metrics
  SELECT infractions_count, on_time_percentage, invalid_reports
  INTO v_infractions, v_on_time_pct, v_invalid_reports
  FROM public.user_reputation
  WHERE user_id = p_user_id;
  
  -- Calculate new score
  -- Start at 100, deduct for:
  -- - 10 points per infraction (max -50)
  -- - Up to 30 points for late check-ins
  -- - 5 points per invalid report (max -20)
  v_new_score := 100;
  v_new_score := v_new_score - LEAST(v_infractions * 10, 50);
  v_new_score := v_new_score - ROUND((100 - COALESCE(v_on_time_pct, 100)) * 0.3);
  v_new_score := v_new_score - LEAST(COALESCE(v_invalid_reports, 0) * 5, 20);
  
  -- Clamp to 0-100
  v_new_score := GREATEST(0, LEAST(100, v_new_score));
  
  -- Update score
  UPDATE public.user_reputation
  SET reputation_score = v_new_score
  WHERE user_id = p_user_id;
  
  RETURN v_new_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Record infraction
-- ============================================
CREATE OR REPLACE FUNCTION public.record_infraction(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_new_score INTEGER;
BEGIN
  UPDATE public.user_reputation
  SET infractions_count = infractions_count + 1
  WHERE user_id = p_user_id;
  
  SELECT public.update_reputation_score(p_user_id) INTO v_new_score;
  RETURN v_new_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.user_reputation IS 'Community reputation tracking for user behavior';
COMMENT ON FUNCTION public.update_reputation_score IS 'Recalculates reputation based on component metrics';
