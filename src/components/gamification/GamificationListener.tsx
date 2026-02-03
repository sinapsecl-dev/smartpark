"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createClientComponentClient } from "@/lib/supabase/client";
import { triggerAchievementToast } from "@/components/AppProviders";

export function GamificationListener() {
    // Use useMemo to ensure stable supabase client reference
    const supabase = useMemo(() => createClientComponentClient(), []);
    const [userId, setUserId] = useState<string | null>(null);
    const hasCheckedRecent = useRef(false);
    const sessionChecked = useRef(false);

    // Listen for auth state changes - this is the proper way to track login
    useEffect(() => {
        console.log("[GamificationListener] Setting up auth state listener");

        // Check initial session
        const checkInitialSession = async () => {
            if (sessionChecked.current) return;
            sessionChecked.current = true;

            console.log("[GamificationListener] Checking initial session...");
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                console.log("[GamificationListener] Initial session found:", session.user.id);
                setUserId(session.user.id);
            } else {
                console.log("[GamificationListener] No initial session");
            }
        };

        checkInitialSession();

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("[GamificationListener] Auth state changed:", event, session?.user?.id);

            if (event === 'SIGNED_IN' && session?.user) {
                console.log("[GamificationListener] User signed in:", session.user.id);
                setUserId(session.user.id);
                // Reset the check flag so we check for recent achievements on new login
                hasCheckedRecent.current = false;
            } else if (event === 'SIGNED_OUT') {
                console.log("[GamificationListener] User signed out");
                setUserId(null);
                hasCheckedRecent.current = false;
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    // Check for recently unlocked achievements when userId changes
    useEffect(() => {
        console.log("[GamificationListener] Recent check effect - userId:", userId, "hasChecked:", hasCheckedRecent.current);
        if (!userId || hasCheckedRecent.current) return;
        hasCheckedRecent.current = true;

        const checkRecentAchievements = async () => {
            console.log("[GamificationListener] Checking for recent achievements...");

            // Get achievements unlocked in the last 120 seconds (2 minutes to be safe)
            const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();

            // First query: get recent user achievements
            const { data: recentAchievements, error: achievementsError } = await (supabase as any)
                .from('user_achievements')
                .select('achievement_id, unlocked_at')
                .eq('user_id', userId)
                .gte('unlocked_at', twoMinutesAgo)
                .order('unlocked_at', { ascending: true });

            if (achievementsError) {
                console.error("[GamificationListener] Error checking recent achievements:", achievementsError);
                return;
            }

            console.log("[GamificationListener] Recent achievements result:", recentAchievements);

            if (!recentAchievements || recentAchievements.length === 0) {
                console.log("[GamificationListener] No recent achievements found");
                return;
            }

            console.log("[GamificationListener] Found recent achievements:", recentAchievements.length);

            // Second query: get all achievement definitions in one query
            const achievementIds = recentAchievements.map((a: any) => a.achievement_id);
            const { data: definitions, error: defsError } = await (supabase as any)
                .from('achievements_definitions')
                .select('id, name, description, icon, xp_bonus')
                .in('id', achievementIds);

            if (defsError) {
                console.error("[GamificationListener] Error fetching achievement definitions:", defsError);
                return;
            }

            console.log("[GamificationListener] Achievement definitions:", definitions);

            // Create a map for quick lookup
            const defMap = new Map(definitions?.map((d: any) => [d.id, d]) || []);

            // Show each achievement toast with a delay
            for (let i = 0; i < recentAchievements.length; i++) {
                const achievement = recentAchievements[i];
                const def = defMap.get(achievement.achievement_id) as any;

                if (def) {
                    // Check if already shown in this session (prevent duplicates on reload)
                    const storageKey = `achievement_toast_${achievement.achievement_id}`;
                    if (typeof window !== 'undefined' && sessionStorage.getItem(storageKey)) {
                        console.log("[GamificationListener] Toast already shown in session:", def.name);
                        continue;
                    }

                    console.log("[GamificationListener] Scheduling toast for:", def.name, "in", (i * 5500 + 500), "ms");
                    // Delay each toast by 5.5 seconds to ensure previous one finishes (5s autoclose + 0.5s buffer)
                    setTimeout(() => {
                        console.log("[GamificationListener] NOW triggering toast for:", def.name);
                        triggerAchievementToast({
                            id: def.id,
                            name: def.name,
                            description: def.description,
                            icon: def.icon,
                            xpBonus: def.xp_bonus,
                            requirement: { type: 'recent_check' }
                        });

                        // Mark as shown
                        if (typeof window !== 'undefined') {
                            sessionStorage.setItem(storageKey, 'true');
                        }
                    }, i * 5500 + 500); // Start after 500ms, then 5.5s apart
                }
            }
        };

        // Small delay to ensure database has committed the achievements
        setTimeout(() => {
            checkRecentAchievements();
        }, 1000);
    }, [userId, supabase]);

    // Subscribe to realtime updates for future achievements
    useEffect(() => {
        if (!userId) return;

        console.log("[GamificationListener] Setting up realtime listener for user:", userId);

        const channel = supabase
            .channel(`achievements-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'user_achievements',
                    filter: `user_id=eq.${userId}`,
                },
                async (payload) => {
                    console.log("[GamificationListener] Achievement unlocked via Realtime!", payload);
                    const newAchievement = payload.new as { achievement_id: string };

                    // Fetch definition details
                    const { data: definition, error } = await (supabase as any)
                        .from('achievements_definitions')
                        .select('*')
                        .eq('id', newAchievement.achievement_id)
                        .single();

                    if (error) {
                        console.error("[GamificationListener] Error fetching achievement definition:", error);
                        return;
                    }

                    if (definition) {
                        console.log("[GamificationListener] Triggering realtime toast for:", definition.name);
                        triggerAchievementToast({
                            id: definition.id,
                            name: definition.name,
                            description: definition.description,
                            icon: definition.icon,
                            xpBonus: definition.xp_bonus,
                            requirement: { type: 'realtime_trigger' }
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_experience',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    console.log("[GamificationListener] XP updated!", payload);
                    const newXPData = payload.new as { total_xp: number; level: number };

                    // Broadcast event for components to update their UI
                    if (typeof window !== "undefined") {
                        window.dispatchEvent(
                            new CustomEvent("xp:update", {
                                detail: {
                                    totalXP: newXPData.total_xp,
                                    level: newXPData.level
                                }
                            })
                        );
                    }
                }
            )
            .subscribe((status) => {
                console.log("[GamificationListener] Realtime subscription status:", status);
            });

        return () => {
            console.log("[GamificationListener] Cleaning up realtime channel");
            supabase.removeChannel(channel);
        };
    }, [userId, supabase]);

    return null; // This component is invisible
}
