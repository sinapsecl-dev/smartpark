"use client";

import { useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";

interface BookingConfettiProps {
    trigger: boolean;
    onComplete?: () => void;
}

/**
 * BookingConfetti Component
 * Displays celebration confetti when a booking is confirmed.
 * Uses canvas-confetti for performant particle animation.
 */
export function BookingConfetti({ trigger, onComplete }: BookingConfettiProps) {
    const hasTriggered = useRef(false);

    const launchConfetti = useCallback(() => {
        const duration = 2500;
        const animationEnd = Date.now() + duration;

        const defaults = {
            startVelocity: 30,
            spread: 360,
            ticks: 60,
            zIndex: 9999,
            colors: ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"],
        };

        const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                clearInterval(interval);
                onComplete?.();
                return;
            }

            const particleCount = Math.floor(50 * (timeLeft / duration));

            // Launch from two sides for better visual effect
            confetti({
                ...defaults,
                particleCount: Math.floor(particleCount / 2),
                origin: { x: 0.2, y: 0.6 },
            });

            confetti({
                ...defaults,
                particleCount: Math.floor(particleCount / 2),
                origin: { x: 0.8, y: 0.6 },
            });
        }, 250);

        // Cleanup on unmount
        return () => clearInterval(interval);
    }, [onComplete]);

    useEffect(() => {
        if (trigger && !hasTriggered.current) {
            hasTriggered.current = true;
            launchConfetti();
        }

        // Reset when trigger becomes false
        if (!trigger) {
            hasTriggered.current = false;
        }
    }, [trigger, launchConfetti]);

    return null;
}

/**
 * Trigger confetti imperatively from anywhere in the app.
 * Use this when you need to trigger confetti outside of a component.
 */
export function triggerBookingConfetti() {
    const duration = 2000;
    const animationEnd = Date.now() + duration;

    const defaults = {
        startVelocity: 35,
        spread: 360,
        ticks: 60,
        zIndex: 9999,
        colors: ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"],
    };

    const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            clearInterval(interval);
            return;
        }

        const particleCount = Math.floor(40 * (timeLeft / duration));

        // Launch from two sides
        confetti({
            ...defaults,
            particleCount: Math.floor(particleCount / 2),
            origin: { x: 0.2, y: 0.7 },
        });

        confetti({
            ...defaults,
            particleCount: Math.floor(particleCount / 2),
            origin: { x: 0.8, y: 0.7 },
        });
    }, 200);
}
