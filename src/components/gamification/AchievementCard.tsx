"use client";

import { m } from "framer-motion";
import { Lock, Unlock } from "lucide-react";
import { AchievementDefinition } from "@/types/gamification";
import clsx from "clsx";

interface AchievementCardProps {
    achievement: AchievementDefinition;
    unlockedAt: string | null; // ISO date string if unlocked, null otherwise
    progress?: number; // 0-100
}

export function AchievementCard({ achievement, unlockedAt, progress = 0 }: AchievementCardProps) {
    const isUnlocked = !!unlockedAt;

    return (
        <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={clsx(
                "relative p-4 rounded-xl border flex items-start gap-4 transition-all",
                isUnlocked
                    ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200 dark:border-amber-800"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 opacity-75 grayscale-[0.8]"
            )}
        >
            {/* Icon */}
            <div className={clsx(
                "w-12 h-12 flex items-center justify-center rounded-full text-2xl shadow-sm flex-shrink-0",
                isUnlocked ? "bg-white dark:bg-gray-800" : "bg-gray-200 dark:bg-gray-700"
            )}>
                {achievement.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <h3 className={clsx(
                        "font-bold text-sm sm:text-base leading-tight",
                        isUnlocked ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                    )}>
                        {achievement.name}
                    </h3>
                    {isUnlocked ? (
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full whitespace-nowrap">
                            +{achievement.xp_bonus} XP
                        </span>
                    ) : (
                        <Lock className="w-4 h-4 text-gray-400" />
                    )}
                </div>

                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {achievement.description}
                </p>

                {/* Progress Bar (if not unlocked) */}
                {!isUnlocked && progress > 0 && (
                    <div className="mt-2 text-xs">
                        <div className="flex justify-between text-gray-400 mb-1">
                            <span>Progreso</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-sky-500 rounded-full"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {isUnlocked && (
                    <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-2 font-medium">
                        Desbloqueado el {new Date(unlockedAt).toLocaleDateString()}
                    </p>
                )}
            </div>
        </m.div>
    );
}
