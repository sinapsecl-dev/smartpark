"use client";

import { useMemo } from "react";
import { AvatarStyle } from "@/components/gamification/UserAvatar";
import { UserAvatar } from "@/components/gamification/UserAvatar";
import { getLevelName } from "@/lib/gamification";
import { createClientComponentClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Trophy, Zap } from "lucide-react";
import { LoginStreak } from "../gamification/LoginStreak";

interface MobileHeaderProps {
    userId: string;
    initialEmail: string;
}

export function MobileHeader({ userId, initialEmail }: MobileHeaderProps) {
    const [stats, setStats] = useState<{
        level: number;
        totalXP: number;
        fullName: string | null;
        avatarStyle: AvatarStyle;
        avatarSeed: string;
    } | null>(null);

    const supabase = createClientComponentClient();

    useEffect(() => {
        async function fetchStats() {
            const [xpResult, profileResult, avatarResult] = await Promise.all([
                supabase
                    .from("user_experience" as never)
                    .select("total_xp, level" as never)
                    .eq("user_id" as never, userId as never)
                    .single(),
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

            const xp = xpResult.data as any;
            const profile = profileResult.data as any;
            const avatar = avatarResult.data as any;

            setStats({
                level: xp?.level ?? 1,
                totalXP: xp?.total_xp ?? 0,
                fullName: profile?.full_name ?? null,
                avatarStyle: avatar?.avatar_style ?? "bottts",
                avatarSeed: avatar?.avatar_seed ?? userId,
            });
        }
        fetchStats();

        // Subscribe to real-time changes using the same logic as UserProfileCard
        const channel = supabase
            .channel(`mobile-header-avatar-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_avatars',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    console.log("MobileHeader: Avatar updated", payload);
                    const newAvatar = payload.new as { avatar_style: AvatarStyle; avatar_seed: string };
                    setStats(prev => prev ? {
                        ...prev,
                        avatarStyle: newAvatar.avatar_style,
                        avatarSeed: newAvatar.avatar_seed
                    } : null);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, userId]);

    if (!stats) return null; // Or a minimal skeleton

    return (
        <div className="flex items-center justify-between py-3 bg-white dark:bg-[#1e2a32] -mx-4 px-4 sticky top-0 z-30 border-b border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <UserAvatar
                        userId={userId}
                        style={stats.avatarStyle}
                        seed={stats.avatarSeed}
                        size="sm"
                        className="ring-2 ring-white dark:ring-gray-700"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-sky-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-gray-800">
                        {stats.level}
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                        Hola, {stats.fullName?.split(" ")[0] || "Residente"}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <LoginStreak userId={userId} />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Link href="/leaderboard" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative">
                    <Trophy className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </Link>
                <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative">
                    <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-800"></span>
                </button>
            </div>
        </div >
    );
}
