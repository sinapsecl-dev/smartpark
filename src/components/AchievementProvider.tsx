"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { AchievementToast, useAchievementListener } from "./AchievementToast";
import { createClientComponentClient } from "@/lib/supabase/client";

interface AchievementProviderProps {
    children: React.ReactNode;
}

/**
 * AchievementProvider Component
 * Wraps the app to provide real-time achievement notifications.
 * Listens for new achievements and displays toast notifications.
 */
export function AchievementProvider({ children }: AchievementProviderProps) {
    const [userId, setUserId] = useState<string | null>(null);
    const supabase = createClientComponentClient();

    // Get current user
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUserId(user?.id || null);
        };
        getUser();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUserId(session?.user?.id || null);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    // Use the achievement listener hook
    const { latestAchievement, clearAchievement } = useAchievementListener(userId);

    return (
        <>
            {children}
            <AchievementToast
                achievement={latestAchievement}
                onClose={clearAchievement}
            />
        </>
    );
}
