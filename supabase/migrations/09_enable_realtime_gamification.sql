-- Migration: 09_enable_realtime_gamification
-- Description: Enable Realtime for gamification tables to support instant UI updates

-- Add tables to the realtime publication
-- This is required for the client to receive postgres_changes events

BEGIN;

  -- Enable for XP updates (XP bar animation)
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_experience;

  -- Enable for Achievement unlocks (Toast notifications)
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;

  -- Enable for Avatar updates (Profile/Dashboard sync)
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_avatars;

COMMIT;
