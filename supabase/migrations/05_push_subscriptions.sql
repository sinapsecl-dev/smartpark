-- Migration: 05_push_subscriptions
-- Description: Push notification subscriptions for Web Push API with VAPID

-- Push subscriptions table for Web Push notifications
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  
  -- Web Push API subscription data
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  
  -- Metadata for debugging and management
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint on endpoint to prevent duplicates
  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

-- Optimized indexes for common query patterns
-- Index for fetching active subscriptions by user (most common query)
CREATE INDEX idx_push_subscriptions_user_active 
  ON public.push_subscriptions(user_id) 
  WHERE is_active = true;

-- Index for broadcast notifications to all users in a condominium
CREATE INDEX idx_push_subscriptions_condo_active 
  ON public.push_subscriptions(condominium_id) 
  WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view and manage their own subscriptions
CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own push subscriptions"
  ON public.push_subscriptions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  USING (user_id = auth.uid());

-- Service role can access all subscriptions (for Edge Functions)
CREATE POLICY "Service role can access all push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_push_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_push_subscription_timestamp
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_push_subscription_timestamp();

-- Comment on table for documentation
COMMENT ON TABLE public.push_subscriptions IS 'Web Push API subscriptions for sending notifications to users';
