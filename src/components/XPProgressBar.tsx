"use client";

import { m } from "framer-motion";
import { getLevelProgress, getXPForLevel, getXPForNextLevel, getLevelName } from "@/lib/gamification";

interface XPProgressBarProps {
    currentXP: number;
    level: number;
    showDetails?: boolean;
    className?: string;
}

/**
 * XPProgressBar Component
 * Animated progress bar showing XP towards next level.
 * Uses Framer Motion for smooth width transitions.
 */
export function XPProgressBar({
    currentXP,
    level,
    showDetails = true,
    className = "",
}: XPProgressBarProps) {
    const progress = getLevelProgress(currentXP, level);
    const currentLevelXP = getXPForLevel(level);
    const nextLevelXP = getXPForNextLevel(level);
    const xpInLevel = currentXP - currentLevelXP;
    const xpNeeded = nextLevelXP - currentLevelXP;
    const levelName = getLevelName(level);
    const isMaxLevel = level >= 10;

    return (
        <div className={`space-y-2 ${className}`}>
            {showDetails && (
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">Nivel {level}</span>
                        <span className="text-gray-500">({levelName})</span>
                    </div>
                    <span className="text-gray-600 tabular-nums">
                        {isMaxLevel ? (
                            <span className="text-sky-600 font-medium">¡Nivel máximo!</span>
                        ) : (
                            <>
                                {xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP
                            </>
                        )}
                    </span>
                </div>
            )}

            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                <m.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 via-sky-400 to-green-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{
                        duration: 0.8,
                        ease: [0.25, 0.1, 0.25, 1],
                    }}
                />

                {/* Shimmer effect */}
                <m.div
                    className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{
                        duration: 1.5,
                        delay: 0.8,
                        repeat: 0,
                    }}
                />
            </div>

            {showDetails && !isMaxLevel && (
                <p className="text-xs text-gray-500 text-right">
                    {(nextLevelXP - currentXP).toLocaleString()} XP para nivel {level + 1}
                </p>
            )}
        </div>
    );
}

/**
 * Compact version for headers/sidebars
 */
export function XPProgressBarCompact({
    currentXP,
    level,
}: Pick<XPProgressBarProps, "currentXP" | "level">) {
    const progress = getLevelProgress(currentXP, level);

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">Lv.{level}</span>
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <m.div
                    className="h-full bg-sky-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />
            </div>
            <span className="text-xs text-gray-500 tabular-nums min-w-[40px] text-right">
                {currentXP} XP
            </span>
        </div>
    );
}
