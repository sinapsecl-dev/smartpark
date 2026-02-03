"use client";

import { AchievementCard } from "./AchievementCard";
import { AchievementDefinition, UserAchievement } from "@/types/gamification";
import { Trophy } from "lucide-react";

interface AchievementListProps {
    definitions: AchievementDefinition[];
    userAchievements: UserAchievement[];
}

export function AchievementList({ definitions, userAchievements }: AchievementListProps) {
    // Merge data: Match definitions with user progress
    const achievementsWithStatus = definitions.map(def => {
        const userAch = userAchievements.find(ua => ua.achievement_id === def.id);
        return {
            definition: def,
            unlockedAt: userAch?.unlocked_at || null,
            progress: userAch?.progress || 0
        };
    });

    // Sort: Unlocked first, then by display order
    const sortedAchievements = achievementsWithStatus.sort((a, b) => {
        // If one is unlocked and other isn't, unlocked comes first
        if (!!a.unlockedAt !== !!b.unlockedAt) {
            return !!a.unlockedAt ? -1 : 1;
        }
        // Then by order
        return (a.definition.display_order || 0) - (b.definition.display_order || 0);
    });

    const totalXP = achievementsWithStatus
        .filter(a => a.unlockedAt)
        .reduce((sum, a) => sum + (a.definition.xp_bonus || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Trophy className="w-5 h-5" />
                    <span className="font-bold text-lg">Logros</span>
                </div>
                <div className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-900 dark:text-white">
                        {achievementsWithStatus.filter(a => a.unlockedAt).length}
                    </span>
                    /{achievementsWithStatus.length} desbloqueados
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sortedAchievements.map(({ definition, unlockedAt, progress }) => (
                    <AchievementCard
                        key={definition.id}
                        achievement={definition}
                        unlockedAt={unlockedAt}
                        progress={progress}
                    />
                ))}
            </div>
        </div>
    );
}
