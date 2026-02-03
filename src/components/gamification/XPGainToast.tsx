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
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="fixed top-6 left-1/2 -translate-x-1/2 z-[100]"
                >
                    <div className={clsx(
                        'flex items-center gap-3 px-4 py-2.5 rounded-full shadow-xl ring-1 ring-black/5 backdrop-blur-sm',
                        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
                    )}>
                        {/* Icon Circle */}
                        <div className={clsx(
                            'w-10 h-10 rounded-full flex items-center justify-center shadow-inner',
                            leveledUp
                                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                        )}>
                            <m.div
                                initial={{ rotate: -180, scale: 0 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ delay: 0.1, type: 'spring' }}
                            >
                                {leveledUp ? (
                                    <Award size={20} strokeWidth={2.5} />
                                ) : (
                                    <Star size={18} strokeWidth={2.5} fill="currentColor" className="opacity-20 stroke-current absolute" />
                                )}
                                {!leveledUp && <Star size={18} strokeWidth={2.5} />}
                            </m.div>
                        </div>

                        {/* Content */}
                        <div className="flex flex-col pr-2">
                            <m.span
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="font-bold text-slate-800 dark:text-white leading-none text-base"
                            >
                                +{xpGained} XP
                            </m.span>

                            {leveledUp && (
                                <m.span
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider leading-none mt-1 flex items-center gap-1"
                                >
                                    ¡Nivel {newLevel}! <TrendingUp size={10} />
                                </m.span>
                            )}
                        </div>
                    </div>

                    {/* Sparkles animation (subtle) */}
                    {leveledUp && (
                        <m.div
                            className="absolute inset-0 pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1.5, repeat: 1 }}
                        >
                            {[...Array(6)].map((_, i) => (
                                <m.span
                                    key={i}
                                    className="absolute text-amber-400 text-[10px]"
                                    initial={{
                                        opacity: 0,
                                        x: '50%',
                                        y: '50%',
                                    }}
                                    animate={{
                                        opacity: [0, 1, 0],
                                        x: `${50 + (Math.random() - 0.5) * 150}%`,
                                        y: `${50 + (Math.random() - 0.5) * 150}%`,
                                        scale: [0, 1, 0],
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        delay: i * 0.1,
                                    }}
                                >
                                    ✨
                                </m.span>
                            ))}
                        </m.div>
                    )}
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
