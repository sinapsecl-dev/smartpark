"use client";

import { useEffect, useState, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/gamification";
import type { Achievement } from "@/lib/gamification";
import { createClientComponentClient } from "@/lib/supabase/client";

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
                    initial={{ y: 50, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 50, opacity: 0, scale: 0.9 }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                    }}
                    className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 md:max-w-sm"
                >
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-2xl flex items-start gap-4 ring-1 ring-black/5 relative overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute -top-10 -right-10 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />
                        <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />

                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            aria-label="Cerrar"
                        >
                            <X size={16} />
                        </button>

                        {/* Icon Container */}
                        <div className="flex-shrink-0 relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center border border-primary/20 shadow-sm">
                                <div className="text-2xl">{achievement.icon}</div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-yellow-900 shadow-sm border border-white dark:border-slate-900">
                                +{achievement.xpBonus}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-0.5 relative z-10">
                            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                Logro Desbloqueado
                            </p>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight mb-1">
                                {achievement.name}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug">
                                {achievement.description}
                            </p>
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
    const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
    const supabase = createClientComponentClient();

    // Process queue - show one achievement at a time
    useEffect(() => {
        if (!latestAchievement && achievementQueue.length > 0) {
            const [next, ...rest] = achievementQueue;
            setLatestAchievement(next);
            setAchievementQueue(rest);
        }
    }, [latestAchievement, achievementQueue]);

    useEffect(() => {
        if (!userId) return;

        // Subscribe to new achievements for this user
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
                    // Get the achievement definition
                    const achievementId = payload.new.achievement_id as string;

                    // Find the achievement in ACHIEVEMENTS constant (it's a Record object)
                    const achievementDef = Object.values(ACHIEVEMENTS).find(
                        (a: Achievement) => a.id === achievementId
                    );

                    if (achievementDef) {
                        // Add to queue
                        setAchievementQueue(prev => [...prev, achievementDef]);

                        // Vibrate for haptic feedback
                        if ('vibrate' in navigator) {
                            navigator.vibrate([100, 50, 100]);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, supabase]);

    const clearAchievement = useCallback(() => {
        setLatestAchievement(null);
    }, []);

    return { latestAchievement, clearAchievement };
}
