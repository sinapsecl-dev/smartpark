/**
 * Gamification Constants
 * XP rewards, level thresholds, and achievement definitions
 */

// XP rewards for different actions
export const XP_REWARDS = {
    BOOKING_CREATED: 10,
    BOOKING_COMPLETED: 20,
    CHECK_IN_ON_TIME: 50,
    CHECK_OUT_ON_TIME: 30,
    REPORT_VALID_ISSUE: 40,
    INVITE_GUEST: 15,
    PROFILE_COMPLETED: 25,
    FIRST_LOGIN_OF_DAY: 5,
} as const;

export type XPAction = keyof typeof XP_REWARDS;

// Level thresholds (index = level - 1)
export const LEVEL_THRESHOLDS = [
    0,     // Level 1: 0 XP
    50,    // Level 2: 50 XP
    150,   // Level 3: 150 XP
    300,   // Level 4: 300 XP
    500,   // Level 5: 500 XP
    750,   // Level 6: 750 XP
    1050,  // Level 7: 1050 XP
    1400,  // Level 8: 1400 XP
    1800,  // Level 9: 1800 XP
    2250,  // Level 10: 2250 XP (Master)
] as const;

// Level names for UI display
export const LEVEL_NAMES = [
    "Novato",
    "Aprendiz",
    "Conductor",
    "Experto",
    "Veterano",
    "Maestro",
    "Leyenda",
    "Campeón",
    "Élite",
    "Supremo",
] as const;

// Achievement definitions
export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    xpBonus: number;
    requirement: {
        type: string;
        count?: number;
        hour?: number;
        months?: number;
    };
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
    FIRST_BOOKING: {
        id: "first_booking",
        name: "Primer Viaje",
        description: "Completaste tu primera reserva",
        icon: "🚀",
        xpBonus: 25,
        requirement: { type: "bookings_completed", count: 1 },
    },
    HABITUAL: {
        id: "habitual",
        name: "Usuario Habitual",
        description: "5 reservas completadas",
        icon: "🔥",
        xpBonus: 50,
        requirement: { type: "bookings_completed", count: 5 },
    },
    PUNCTUAL_PERFECT: {
        id: "punctual_perfect",
        name: "Puntual Perfecto",
        description: "10 check-ins a tiempo consecutivos",
        icon: "⏰",
        xpBonus: 100,
        requirement: { type: "on_time_checkins", count: 10 },
    },
    GOOD_NEIGHBOR: {
        id: "good_neighbor",
        name: "Vecino Ejemplar",
        description: "Sin infracciones durante 3 meses",
        icon: "🏆",
        xpBonus: 150,
        requirement: { type: "clean_record_months", months: 3 },
    },
    SOCIAL_HOST: {
        id: "social_host",
        name: "Anfitrión Social",
        description: "Gestionaste 20 reservas de invitados",
        icon: "🎉",
        xpBonus: 75,
        requirement: { type: "guest_bookings", count: 20 },
    },
    EARLY_BIRD: {
        id: "early_bird",
        name: "Madrugador",
        description: "Check-in antes de las 7 AM",
        icon: "🌅",
        xpBonus: 30,
        requirement: { type: "early_checkin", hour: 7 },
    },
    NIGHT_OWL: {
        id: "night_owl",
        name: "Noctámbulo",
        description: "Check-in después de las 10 PM",
        icon: "🌙",
        xpBonus: 30,
        requirement: { type: "late_checkin", hour: 22 },
    },
    COMMUNITY_GUARDIAN: {
        id: "community_guardian",
        name: "Guardián de la Comunidad",
        description: "5 reportes válidos de irregularidades",
        icon: "🛡️",
        xpBonus: 80,
        requirement: { type: "valid_reports", count: 5 },
    },
} as const;

/**
 * Calculate level from total XP
 * @param xp - Total XP amount
 * @returns Level number (1-10)
 */
export function calculateLevel(xp: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_THRESHOLDS[i]) {
            return i + 1;
        }
    }
    return 1;
}

/**
 * Get XP required for a specific level
 * @param level - Target level (1-10)
 * @returns XP threshold for that level
 */
export function getXPForLevel(level: number): number {
    const index = Math.max(0, Math.min(level - 1, LEVEL_THRESHOLDS.length - 1));
    return LEVEL_THRESHOLDS[index];
}

/**
 * Get XP required for next level
 * @param currentLevel - Current level (1-10)
 * @returns XP threshold for next level, or max for level 10
 */
export function getXPForNextLevel(currentLevel: number): number {
    if (currentLevel >= 10) return LEVEL_THRESHOLDS[9];
    return LEVEL_THRESHOLDS[currentLevel];
}

/**
 * Calculate progress percentage to next level
 * @param currentXP - Current total XP
 * @param currentLevel - Current level
 * @returns Progress percentage (0-100)
 */
export function getLevelProgress(currentXP: number, currentLevel: number): number {
    if (currentLevel >= 10) return 100;

    const currentLevelXP = getXPForLevel(currentLevel);
    const nextLevelXP = getXPForNextLevel(currentLevel);
    const xpInLevel = currentXP - currentLevelXP;
    const xpNeeded = nextLevelXP - currentLevelXP;

    return Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100));
}

/**
 * Get level name for display
 * @param level - Level number (1-10)
 * @returns Human readable level name
 */
export function getLevelName(level: number): string {
    const index = Math.max(0, Math.min(level - 1, LEVEL_NAMES.length - 1));
    return LEVEL_NAMES[index];
}
