"use server";

import { createServerComponentClient } from "@/lib/supabase/server";
import { XP_REWARDS, XPAction, ACHIEVEMENTS } from "@/lib/gamification";
import { revalidatePath } from "next/cache";

interface AwardXPResult {
    success: boolean;
    xpGained: number;
    newLevel: number;
    leveledUp: boolean;
    error?: string;
}

/**
 * Awards XP to a user for completing an action.
 * Uses database function for atomic level calculation.
 * 
 * @param userId - User ID to award XP to
 * @param action - Action that triggered XP award
 * @returns Result with new XP total and level info
 */
export async function awardXP(
    userId: string,
    action: XPAction
): Promise<AwardXPResult> {
    const supabase = await createServerComponentClient();
    const xpAmount = XP_REWARDS[action];

    try {
        // Use database function for atomic XP update and level calculation
        const { data, error } = await supabase.rpc("award_xp" as never, {
            p_user_id: userId,
            p_xp_amount: xpAmount,
            p_action: action,
        } as never);

        if (error) {
            console.error("Error awarding XP:", error);
            return {
                success: false,
                xpGained: 0,
                newLevel: 1,
                leveledUp: false,
                error: error.message,
            };
        }

        const result = data as unknown as {
            new_total_xp: number;
            new_level: number;
            leveled_up: boolean;
        }[];

        const xpResult = result?.[0];
        const leveledUp = xpResult?.leveled_up ?? false;

        // Check for achievements after XP award
        await checkAchievements(userId, action);

        // Revalidate profile and dashboard
        revalidatePath("/profile");
        revalidatePath("/dashboard");

        // If leveled up, send push notification
        if (leveledUp) {
            await sendLevelUpNotification(userId, xpResult.new_level);
        }

        return {
            success: true,
            xpGained: xpAmount,
            newLevel: xpResult?.new_level ?? 1,
            leveledUp,
        };
    } catch (error) {
        console.error("Unexpected error awarding XP:", error);
        return {
            success: false,
            xpGained: 0,
            newLevel: 1,
            leveledUp: false,
            error: "Unexpected error",
        };
    }
}

/**
 * Get user's gamification stats
 * Single query to fetch XP, level, and achievement count
 */
export async function getUserGamificationStats(userId: string) {
    const supabase = await createServerComponentClient();

    const [xpResult, achievementsResult] = await Promise.all([
        supabase
            .from("user_experience" as never)
            .select("total_xp, level, last_xp_gained_at" as never)
            .eq("user_id" as never, userId as never)
            .single(),
        supabase
            .from("user_achievements" as never)
            .select("achievement_id, unlocked_at" as never)
            .eq("user_id" as never, userId as never)
            .not("unlocked_at" as never, "is" as never, null as never),
    ]);

    type XPData = { total_xp: number; level: number; last_xp_gained_at: string | null };
    type AchievementData = { achievement_id: string; unlocked_at: string }[];

    const xpData = xpResult.data as unknown as XPData | null;
    const achievements = achievementsResult.data as unknown as AchievementData ?? [];

    return {
        totalXP: xpData?.total_xp ?? 0,
        level: xpData?.level ?? 1,
        lastXPGained: xpData?.last_xp_gained_at,
        achievementCount: achievements.length,
        achievementIds: achievements.map((a) => a.achievement_id),
    };
}

/**
 * Check and unlock achievements based on user's action
 */
async function checkAchievements(userId: string, action: XPAction): Promise<void> {
    const supabase = await createServerComponentClient();

    // Map actions to achievement checks
    if (action === "BOOKING_COMPLETED") {
        // Count completed bookings
        const { count } = await supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "completed");

        if (count === 1) {
            await unlockAchievement(userId, ACHIEVEMENTS.FIRST_BOOKING.id);
        } else if (count === 5) {
            await unlockAchievement(userId, ACHIEVEMENTS.HABITUAL.id);
        }
    }

    if (action === "CHECK_IN_ON_TIME") {
        // Check for early bird (before 7 AM) or night owl (after 10 PM)
        const now = new Date();
        const hour = now.getHours();

        if (hour < 7) {
            await unlockAchievement(userId, ACHIEVEMENTS.EARLY_BIRD.id);
        } else if (hour >= 22) {
            await unlockAchievement(userId, ACHIEVEMENTS.NIGHT_OWL.id);
        }
    }

    if (action === "REPORT_VALID_ISSUE") {
        // Count valid reports
        const { count } = await supabase
            .from("infractions")
            .select("id", { count: "exact", head: true })
            .eq("reported_by", userId);

        if (count && count >= 5) {
            await unlockAchievement(userId, ACHIEVEMENTS.COMMUNITY_GUARDIAN.id);
        }
    }
}

/**
 * Unlock an achievement for a user
 */
async function unlockAchievement(userId: string, achievementId: string): Promise<boolean> {
    const supabase = await createServerComponentClient();

    const achievement = Object.values(ACHIEVEMENTS).find((a) => a.id === achievementId);
    if (!achievement) return false;

    // Try to insert (will fail silently if already exists due to unique constraint)
    const { error } = await supabase.from("user_achievements" as never).upsert(
        {
            user_id: userId,
            achievement_id: achievementId,
            unlocked_at: new Date().toISOString(),
            progress: 100,
        } as never,
        { onConflict: "user_id,achievement_id" as never }
    );

    if (error) {
        // Already unlocked or error
        return false;
    }

    // Award bonus XP for achievement
    await awardXP(userId, "PROFILE_COMPLETED"); // Placeholder action for achievement bonus

    // Send achievement notification
    await sendAchievementNotification(userId, achievement);

    revalidatePath("/profile/achievements");
    return true;
}

/**
 * Send push notification for level up
 */
async function sendLevelUpNotification(userId: string, newLevel: number): Promise<void> {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId,
                    title: "🎉 ¡Subiste de nivel!",
                    body: `Ahora eres nivel ${newLevel}. ¡Sigue así!`,
                    url: "/profile",
                    type: "level_up",
                }),
            }
        );

        if (!response.ok) {
            console.error("Failed to send level up notification");
        }
    } catch (error) {
        console.error("Error sending level up notification:", error);
    }
}

/**
 * Send push notification for achievement unlock
 */
async function sendAchievementNotification(
    userId: string,
    achievement: (typeof ACHIEVEMENTS)[keyof typeof ACHIEVEMENTS]
): Promise<void> {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId,
                    title: `🏆 Logro Desbloqueado: ${achievement.name}`,
                    body: achievement.description,
                    url: "/profile/achievements",
                    type: "achievement",
                }),
            }
        );

        if (!response.ok) {
            console.error("Failed to send achievement notification");
        }
    } catch (error) {
        console.error("Error sending achievement notification:", error);
    }
}
