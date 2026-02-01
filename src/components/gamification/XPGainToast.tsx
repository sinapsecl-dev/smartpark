'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Star, TrendingUp, Award } from 'lucide-react';
import clsx from 'clsx';

interface XPGainToastProps {
    xpGained: number;
    leveledUp?: boolean;
    newLevel?: number;
    onClose?: () => void;
}

/**
 * Animated toast that shows XP gained after an action.
 * Displays level-up celebration if applicable.
 */
export function XPGainToast({
    xpGained,
    leveledUp = false,
    newLevel = 1,
    onClose
}: XPGainToastProps) {
    const [show, setShow] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShow(false);
            onClose?.();
        }, leveledUp ? 5000 : 3000);

        return () => clearTimeout(timer);
    }, [leveledUp, onClose]);

    return (
        <AnimatePresence>
            {show && (
                <m.div
                    initial={{ opacity: 0, y: -50, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                    className={clsx(
                        'fixed top-20 left-1/2 -translate-x-1/2 z-[100]',
                        'px-5 py-3 rounded-2xl shadow-2xl',
                        'flex items-center gap-3',
                        leveledUp
                            ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    )}
                >
                    {/* Icon */}
                    <m.div
                        initial={{ rotate: -180, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                        className="flex-shrink-0"
                    >
                        {leveledUp ? (
                            <Award className="w-8 h-8 text-white drop-shadow-lg" />
                        ) : (
                            <Star className="w-7 h-7 text-white drop-shadow-lg" />
                        )}
                    </m.div>

                    {/* Content */}
                    <div className="flex flex-col">
                        <m.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-white font-bold text-lg drop-shadow"
                        >
                            +{xpGained} XP
                        </m.span>

                        {leveledUp && (
                            <m.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex items-center gap-1 text-white/90 text-sm"
                            >
                                <TrendingUp className="w-4 h-4" />
                                <span>¡Subiste a Nivel {newLevel}!</span>
                            </m.div>
                        )}
                    </div>

                    {/* Sparkles animation */}
                    <m.div
                        className="absolute inset-0 pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1, repeat: 2 }}
                    >
                        {[...Array(6)].map((_, i) => (
                            <m.span
                                key={i}
                                className="absolute text-white text-xs"
                                initial={{
                                    opacity: 0,
                                    x: '50%',
                                    y: '50%',
                                }}
                                animate={{
                                    opacity: [0, 1, 0],
                                    x: `${50 + (Math.random() - 0.5) * 100}%`,
                                    y: `${50 + (Math.random() - 0.5) * 100}%`,
                                }}
                                transition={{
                                    duration: 1,
                                    delay: i * 0.1,
                                    repeat: 1,
                                }}
                            >
                                ✨
                            </m.span>
                        ))}
                    </m.div>
                </m.div>
            )}
        </AnimatePresence>
    );
}

// Global state for showing toasts from anywhere
type XPToastState = {
    show: boolean;
    xpGained: number;
    leveledUp: boolean;
    newLevel: number;
};

let globalSetXPToast: React.Dispatch<React.SetStateAction<XPToastState>> | null = null;

/**
 * Show XP gain toast from anywhere in the app.
 * Must have XPGainToastProvider mounted.
 */
export function showXPToast(xpGained: number, leveledUp = false, newLevel = 1) {
    if (globalSetXPToast) {
        globalSetXPToast({ show: true, xpGained, leveledUp, newLevel });
    }
}

/**
 * Provider component that mounts the XP toast.
 * Add this to your root layout.
 */
export function XPGainToastProvider() {
    const [state, setState] = useState<XPToastState>({
        show: false,
        xpGained: 0,
        leveledUp: false,
        newLevel: 1,
    });

    useEffect(() => {
        globalSetXPToast = setState;
        return () => {
            globalSetXPToast = null;
        };
    }, []);

    if (!state.show) return null;

    return (
        <XPGainToast
            xpGained={state.xpGained}
            leveledUp={state.leveledUp}
            newLevel={state.newLevel}
            onClose={() => setState(s => ({ ...s, show: false }))}
        />
    );
}
