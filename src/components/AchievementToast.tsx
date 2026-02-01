"use client";

import { useEffect, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/gamification";
import type { Achievement } from "@/lib/gamification";

interface AchievementToastProps {
    achievement: Achievement | null;
    onClose?: () => void;
    autoCloseMs?: number;
}

/**
 * AchievementToast Component
 * Animated toast notification when user unlocks an achievement.
 * Uses Framer Motion for smooth spring animations.
 */
export function AchievementToast({
    achievement,
    onClose,
    autoCloseMs = 5000,
}: AchievementToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (achievement) {
            setIsVisible(true);

            const timer = setTimeout(() => {
                setIsVisible(false);
                onClose?.();
            }, autoCloseMs);

            return () => clearTimeout(timer);
        }
    }, [achievement, autoCloseMs, onClose]);

    const handleClose = () => {
        setIsVisible(false);
        onClose?.();
    };

    return (
        <AnimatePresence>
            {isVisible && achievement && (
                <m.div
                    initial={{ y: -100, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -100, opacity: 0, scale: 0.9 }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                    }}
                    className="fixed top-4 right-4 z-50 max-w-sm"
                >
                    <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 text-white p-4 rounded-xl shadow-2xl">
                        <button
                            onClick={handleClose}
                            className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
                            aria-label="Cerrar"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-start gap-3">
                            <div className="text-4xl flex-shrink-0">{achievement.icon}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-yellow-100 mb-0.5">
                                    🏆 ¡Logro Desbloqueado!
                                </p>
                                <h3 className="font-bold text-lg leading-tight">
                                    {achievement.name}
                                </h3>
                                <p className="text-sm text-white/90 mt-1">
                                    {achievement.description}
                                </p>
                                <p className="text-xs text-yellow-100 mt-2">
                                    +{achievement.xpBonus} XP
                                </p>
                            </div>
                        </div>
                    </div>
                </m.div>
            )}
        </AnimatePresence>
    );
}

/**
 * Hook to listen for achievement unlocks in real-time
 * Connects to Supabase Realtime for the user_achievements table
 */
export function useAchievementListener(userId: string | null) {
    const [latestAchievement, setLatestAchievement] = useState<Achievement | null>(null);

    useEffect(() => {
        if (!userId) return;

        // This would connect to Supabase Realtime
        // Implementation depends on your Realtime setup
        // For now, this is a placeholder for the pattern

        return () => {
            // Cleanup subscription
        };
    }, [userId]);

    const clearAchievement = () => setLatestAchievement(null);

    return { latestAchievement, clearAchievement };
}
