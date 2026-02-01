"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import type { ReactNode } from "react";

interface MotionProviderProps {
    children: ReactNode;
}

/**
 * MotionProvider with LazyMotion
 * Uses domAnimation subset instead of full framer-motion.
 * Reduces bundle size by ~60% while keeping core animations.
 * 
 * Supported features: animate, initial, exit, transition, variants
 * Not supported: layout animations, drag, some gestures
 */
export function MotionProvider({ children }: MotionProviderProps) {
    return (
        <LazyMotion features={domAnimation} strict>
            {children}
        </LazyMotion>
    );
}
