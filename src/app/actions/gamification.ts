"use server";

import { createServerComponentClient } from "@/lib/supabase/server";
import { XP_REWARDS, XPAction, ACHIEVEMENTS } from "@/lib/gamification";
import { revalidatePath } from "next/cache";
import { GamificationDatabase } from "@/types/gamification";

interface AwardXPResult {
    success: boolean;
    xpGained: number;
    newLevel: number;
    leveledUp: boolean;
    error?: string;
}

/**
 * Awards XP to a user for completing an action.
 * Uses database function for atomic level calculation and transaction logging.
 * 
 * @param userId - User ID to award XP to
 * @param action - Action that triggered XP award
 * @param bookingId - Optional booking ID to link to transaction
 * @param metadata - Optional metadata for the transaction
 * @returns Result with new XP total and level info
 */
export async function awardXP(
    userId: string,
    action: XPAction,
    bookingId?: string,
    metadata?: Record<string, any>
): Promise<AwardXPResult> {
    const supabase = await createServerComponentClient<GamificationDatabase>();
    const xpAmount = XP_REWARDS[action];

    // Safety check: Ensure XP amount is defined
    if (xpAmount === undefined) {
        console.error(`XP amount not defined for action: ${action}`);
        return {
            success: false,
            xpGained: 0,
            newLevel: 0,
            leveledUp: false,
            error: "Invalid action",
        };
    }

    try {
        // Use database function for atomic XP update and level calculation
        // cast to any because we updated the signature in migration but generated types might not reflect it yet
        const { data, error } = await (supabase as any).rpc("award_xp", {
            p_user_id: userId,
            p_xp_amount: xpAmount,
            p_action: action,
            p_booking_id: bookingId || null,
            p_metadata: metadata || {},
        });

        if (error) {
            console.error("Error awarding XP:", error);
            // It might fail if user_experience row doesn't exist and conflict handling failed,
            // but the migration 08 updated award_xp to handle insert.
            return {
                success: false,
                xpGained: 0,
                newLevel: 0,
                leveledUp: false,
                error: error.message,
            };
        }

        // result is an array of objects
        const result = data as any as {
            new_total_xp: number;
            new_level: number;
            leveled_up: boolean;
        }[];

        const xpResult = result?.[0];
        const leveledUp = xpResult?.leveled_up ?? false;

        // Check for achievements asynchronously (fire and forget pattern for response speed, 
        // but await here to ensure consistency if caller needs it)
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
 * Check and unlock achievements based on user's action
 * Fetches definitions from DB to ensure rules are up to date.
 */
async function checkAchievements(userId: string, action: XPAction): Promise<void> {
    const supabase = await createServerComponentClient<GamificationDatabase>();

    // 1. Fetch relevant achievements based on action mapping
    // This mapping avoids fetching all achievements every time
    // We can filter by 'category' or 'requirement_type' inferred from action

    let requirementType = "";
    switch (action) {
        case "BOOKING_COMPLETED":
        case "FIRST_BOOKING_EVER":
            requirementType = "bookings_completed";
            break;
        case "CHECK_IN_ON_TIME":
            requirementType = "on_time_checkins";
            // Also check for early bird / night owl in separate logic or via specific requirement types
            break;
        case "REPORT_VALID_ISSUE":
            requirementType = "valid_reports";
            break;
        case "INVITE_GUEST":
            requirementType = "guest_bookings";
            break;
        default:
            // For other actions, we might check general consistency or other types
            break;
    }

    // 2. We also always check for specific 'special' achievements if relevant conditions met
    // (e.g. time based)

    // Fetch user stats needed for comparison
    // Ideally we should use a materialized view or efficient query counters

    // Example: For bookings, count total bookings (confirmed, active, or completed)
    if (action === "BOOKING_CREATED" || action === "BOOKING_COMPLETED" || action === "FIRST_BOOKING_EVER") {
        // Count bookings with any "valid" status (not cancelled)
        const { count } = await supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .in("status", ["confirmed", "active", "completed"]);

        const bookingCount = count || 0;

        // Find achievements with this requirement
        const { data: achievements } = await (supabase
            .from("achievements_definitions") as any)
            .select("*")
            .eq("requirement_type", "bookings_completed");

        if (achievements) {
            for (const achievement of achievements) {
                const requiredCount = achievement.requirement_value?.count;
                if (requiredCount && bookingCount >= requiredCount) {
                    await unlockAchievement(userId, achievement.id);
                }
            }
        }
    }

    if (action === "CHECK_IN_ON_TIME") {
        // Check time-based achievements (Early Bird / Night Owl)
        const now = new Date(); // Use server time
        const hour = now.getHours();

        if (hour < 7) {
            await unlockAchievement(userId, "early_bird");
        } else if (hour >= 22) {
            await unlockAchievement(userId, "night_owl");
        }

        const { data: achievements } = await (supabase
            .from("achievements_definitions") as any)
            .select("*")
            .eq("requirement_type", "on_time_checkins");

        if (achievements?.length) {
            // Count logs with CHECK_IN_ON_TIME action
            const { count } = await (supabase
                .from("xp_transactions") as any)
                .select("id", { count: "exact", head: true })
                .eq("user_id", userId)
                .eq("action_type", "CHECK_IN_ON_TIME");

            const onTimeCount = count || 0;
            for (const achievement of achievements) {
                const requiredCount = achievement.requirement_value?.count;
                if (requiredCount && onTimeCount >= requiredCount) {
                    await unlockAchievement(userId, achievement.id);
                }
            }
        }
    }

    if (action === "REPORT_VALID_ISSUE") {
        const { count } = await supabase
            .from("infractions")
            .select("id", { count: "exact", head: true })
            .eq("reporter_user_id", userId)
            .eq("status", "resolved");

        const reportCount = count || 0;

        const { data: achievements } = await (supabase
            .from("achievements_definitions") as any)
            .select("*")
            .eq("requirement_type", "valid_reports");

        if (achievements) {
            for (const achievement of achievements) {
                const requiredCount = achievement.requirement_value?.count;
                if (requiredCount && reportCount >= requiredCount) {
                    await unlockAchievement(userId, achievement.id);
                }
            }
        }
    }
}

/**
 * Unlock an achievement for a user
 */
async function unlockAchievement(userId: string, achievementId: string): Promise<boolean> {
    const supabase = await createServerComponentClient<GamificationDatabase>();

    // Check if achievement exists in definitions
    const { data: definition } = await (supabase as any)
        .from("achievements_definitions")
        .select("*")
        .eq("id", achievementId)
        .single();

    if (!definition) return false;

    // Try to insert (will fail silently if already exists due to unique constraint)
    const { error } = await (supabase.from("user_achievements") as any).upsert(
        {
            user_id: userId,
            achievement_id: achievementId,
            unlocked_at: new Date().toISOString(),
            progress: 100,
        },
        { onConflict: "user_id,achievement_id" }
    );

    if (error) {
        // Likely already unlocked or other error
        return false;
    }

    // Award bonus XP for achievement (if defined)
    if (definition.xp_bonus > 0) {
        // We use a special internal action type or just reuse general logic
        // But preventing recursion loop -> awardXP should not trigger achievement check for achievement bonus
        // We call the basic RPC directly or pass metadata to avoid loops?
        // Actually awardXP does checkAchievements. 
        // We should add a guard in checkAchievements or use a specific action type that doesn't trigger checks.
        // For now, let's just award it. The action "ACHIEVEMENT_UNLOCKED" is not mapped in checkAchievements.

        await awardXP(userId, "ACHIEVEMENT_UNLOCKED" as any, undefined, { achievement_id: achievementId });
    }

    // Send achievement notification
    await sendAchievementNotification(userId, definition);

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
    achievement: { name: string; description: string }
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
