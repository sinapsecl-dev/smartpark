"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect user's reduced motion preference.
 * Respects accessibility settings for users who prefer no animations.
 * 
 * @returns true if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        // Check if we're on the client
        if (typeof window === "undefined") return;

        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

        // Set initial value
        setPrefersReducedMotion(mediaQuery.matches);

        // Listen for changes
        const handler = (event: MediaQueryListEvent) => {
            setPrefersReducedMotion(event.matches);
        };

        mediaQuery.addEventListener("change", handler);

        return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    return prefersReducedMotion;
}

/**
 * Get animation variants based on reduced motion preference.
 * Returns static values when user prefers reduced motion.
 * 
 * @param prefersReducedMotion - User's motion preference
 * @returns Framer Motion variants object
 */
export function getMotionVariants(prefersReducedMotion: boolean) {
    if (prefersReducedMotion) {
        return {
            initial: { opacity: 1 },
            animate: { opacity: 1 },
            exit: { opacity: 1 },
            transition: { duration: 0 },
        };
    }

    return {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.3, ease: "easeInOut" },
    };
}
