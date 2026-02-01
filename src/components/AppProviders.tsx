"use client";

import { ReactNode, useEffect, useState } from "react";
import { LazyMotion, domAnimation, AnimatePresence, m } from "framer-motion";
import { IOSInstallPrompt } from "@/components/IOSInstallPrompt";
import { AchievementToast } from "@/components/AchievementToast";
import { XPGainToastProvider } from "@/components/gamification/XPGainToast";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { Achievement } from "@/lib/gamification";

interface AppProvidersProps {
    children: ReactNode;
}

/**
 * AppProviders - Global client-side providers and utilities
 * Wraps the app with:
 * - LazyMotion for optimized Framer Motion (60% smaller)
 * - iOS PWA install prompt for iOS Safari users
 * - Global achievement toast listener
 * - Reduced motion preference detection
 */
export function AppProviders({ children }: AppProvidersProps) {
    const prefersReducedMotion = useReducedMotion();
    const [achievement, setAchievement] = useState<Achievement | null>(null);

    // Listen for achievement events from anywhere in the app
    useEffect(() => {
        const handleAchievementUnlock = (event: CustomEvent<Achievement>) => {
            setAchievement(event.detail);
        };

        window.addEventListener(
            "achievement:unlocked" as never,
            handleAchievementUnlock as EventListener
        );

        return () => {
            window.removeEventListener(
                "achievement:unlocked" as never,
                handleAchievementUnlock as EventListener
            );
        };
    }, []);

    return (
        <LazyMotion features={domAnimation} strict>
            <AnimatePresence mode="wait">
                {prefersReducedMotion ? (
                    <div key="static">{children}</div>
                ) : (
                    <m.div
                        key="animated"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        {children}
                    </m.div>
                )}
            </AnimatePresence>

            {/* iOS PWA Install Prompt */}
            <IOSInstallPrompt />

            {/* Global Achievement Toast */}
            <AchievementToast
                achievement={achievement}
                onClose={() => setAchievement(null)}
            />

            {/* Global XP Gain Toast */}
            <XPGainToastProvider />
        </LazyMotion>
    );
}

// Utility function to trigger achievement toast from anywhere
export function triggerAchievementToast(achievement: Achievement) {
    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent("achievement:unlocked", { detail: achievement })
        );
    }
}
