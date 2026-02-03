"use client";

import { useState, useEffect, useCallback } from "react";
import { UserAvatar } from "@/components/gamification/UserAvatar";
import { XPProgressBarCompact } from "@/components/XPProgressBar";
import { ReputationIndicator } from "@/components/ReputationBadge";
import { getLevelName, ACHIEVEMENTS } from "@/lib/gamification";
import { createClientComponentClient } from "@/lib/supabase/client";
import { Trophy, Bell, ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import { AvatarStyle } from "@/components/gamification/UserAvatar";

interface UserStats {
    totalXP: number;
    level: number;
    achievementCount: number;
    reputationScore: number;
    email: string;
    fullName: string | null;
    avatarStyle: AvatarStyle;
    avatarSeed: string;
}

interface UserProfileCardProps {
    userId: string;
    initialEmail: string;
}

/**
 * UserProfileCard Component
 * Displays user's gamification stats inline in the dashboard.
 * Fetches data client-side for real-time updates.
 * Optimized for both desktop and mobile viewports.
 */
export function UserProfileCard({ userId, initialEmail }: UserProfileCardProps) {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClientComponentClient();

    const fetchStats = useCallback(async () => {
        try {
            const [xpResult, infractionsResult, achievementsResult, profileResult, avatarResult] = await Promise.all([
                supabase
                    .from("user_experience" as never)
                    .select("total_xp, level" as never)
                    .eq("user_id" as never, userId as never)
                    .single(),
                supabase
                    .from("infractions")
                    .select("id", { count: "exact", head: true })
                    .eq("offender_user_id", userId), // Check column name - usually offender_user_id
                supabase
                    .from("user_achievements" as never)
                    .select("achievement_id" as never, { count: "exact", head: true } as never)
                    .eq("user_id" as never, userId as never)
                    .not("unlocked_at" as never, "is" as never, null as never),
                supabase
                    .from("users")
                    .select("full_name")
                    .eq("id", userId)
                    .single(),
                supabase
                    .from("user_avatars" as never)
                    .select("avatar_style, avatar_seed" as never)
                    .eq("user_id" as never, userId as never)
                    .single(),
            ]);

            type XPData = { total_xp: number; level: number } | null;
            type ProfileData = { full_name: string | null } | null;
            type AvatarData = { avatar_style: AvatarStyle; avatar_seed: string } | null;

            const xp = xpResult.data as unknown as XPData;
            const profile = profileResult.data as unknown as ProfileData;
            const avatar = avatarResult.data as unknown as AvatarData;

            // Calculate reputation: 100 - (infractions * 10)
            const infractionCount = infractionsResult.count || 0;
            const calculatedReputation = Math.max(0, 100 - (infractionCount * 10));

            setStats({
                totalXP: xp?.total_xp ?? 0,
                level: xp?.level ?? 1,
                achievementCount: achievementsResult.count ?? 0,
                reputationScore: calculatedReputation,
                email: initialEmail,
                fullName: profile?.full_name ?? null,
                avatarStyle: avatar?.avatar_style ?? "bottts",
                avatarSeed: avatar?.avatar_seed ?? userId,
            });
        } catch (error) {
            console.error("Error fetching user stats:", error);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, userId, initialEmail]);

    useEffect(() => {
        fetchStats();

        // Subscribe to real-time changes for avatar
        const channel = supabase
            .channel(`avatar-updates-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT and UPDATE
                    schema: 'public',
                    table: 'user_avatars',
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    console.log("Avatar updated, refreshing stats...");
                    fetchStats();
                }
            )
            .subscribe();

        // Listen for global XP update events (from GamificationListener)
        const handleXPUpdate = (event: CustomEvent<{ totalXP: number; level: number }>) => {
            console.log("UserProfileCard: XP Update received", event.detail);
            setStats(prev => prev ? {
                ...prev,
                totalXP: event.detail.totalXP,
                level: event.detail.level
            } : null);
        };

        if (typeof window !== "undefined") {
            window.addEventListener("xp:update" as never, handleXPUpdate as EventListener);
        }

        return () => {
            supabase.removeChannel(channel);
            if (typeof window !== "undefined") {
                window.removeEventListener("xp:update" as never, handleXPUpdate as EventListener);
            }
        };
    }, [fetchStats, supabase, userId]);

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm animate-pulse">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                    </div>
                </div>
                <div className="mt-4">
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-full" />
                    <div className="flex justify-between mt-1">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-8" />
                    </div>
                </div>
                <div className="grid grid-cols-2 border-t border-gray-100 dark:border-gray-700 mt-4 pt-3 gap-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 ml-auto" />
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const levelName = getLevelName(stats.level);
    const totalAchievements = Object.keys(ACHIEVEMENTS).length;

    return (
        <div className="bg-gradient-to-br from-white via-white to-sky-50 dark:from-gray-800 dark:via-gray-800 dark:to-sky-900/20 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* User Info Section */}
            <div className="p-4 sm:p-5">
                <div className="flex items-center gap-4">
                    {/* Avatar with Level Badge */}
                    <div className="relative flex-shrink-0">
                        <UserAvatar
                            userId={userId}
                            style={stats.avatarStyle}
                            seed={stats.avatarSeed}
                            size="lg"
                            className="ring-2 ring-white dark:ring-gray-700 shadow-lg"
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-sky-500 to-sky-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg ring-2 ring-white dark:ring-gray-800">
                            {stats.level}
                        </div>
                    </div>

                    {/* Name & Level Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {stats.fullName || "Residente"}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-yellow-500" />
                            <span>Nivel {stats.level} • {levelName}</span>
                        </p>
                    </div>

                    {/* Reputation Badge */}
                    <ReputationIndicator score={stats.reputationScore} />
                </div>

                {/* XP Progress Bar */}
                <div className="mt-4">
                    <XPProgressBarCompact currentXP={stats.totalXP} level={stats.level} />
                </div>
            </div>

            {/* Quick Stats Grid - Mobile Optimized */}
            <div className="grid grid-cols-2 border-t border-gray-100 dark:border-gray-700">
                <Link
                    href="/leaderboard"
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-r border-gray-100 dark:border-gray-700"
                >
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">Logros</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="font-semibold text-gray-900 dark:text-white">
                            {stats.achievementCount}
                            <span className="text-gray-400 font-normal">/{totalAchievements}</span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                </Link>

                <Link
                    href="/leaderboard"
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-sky-600 dark:text-sky-400">
                            {stats.totalXP.toLocaleString()} XP
                        </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
            </div>
        </div>
    );
}
