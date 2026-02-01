"use client";

interface ReputationBadgeProps {
    score: number;
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
    className?: string;
}

/**
 * ReputationBadge Component
 * Visual badge showing user's community reputation score.
 * Color-coded: Green (90+), Yellow (70+), Orange (50+), Red (<50)
 */
export function ReputationBadge({
    score,
    size = "md",
    showLabel = true,
    className = "",
}: ReputationBadgeProps) {
    const { color, bgColor, label } = getReputationStyle(score);

    const sizeClasses = {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-3 py-1",
        lg: "text-base px-4 py-1.5",
    };

    return (
        <div
            className={`inline-flex items-center gap-1.5 ${bgColor} ${color} rounded-full font-semibold ${sizeClasses[size]} ${className}`}
        >
            <span className="tabular-nums">{score}</span>
            {showLabel && <span className="font-normal opacity-90">• {label}</span>}
        </div>
    );
}

/**
 * ReputationIndicator - Compact version for lists
 */
export function ReputationIndicator({ score }: { score: number }) {
    const { dotColor } = getReputationStyle(score);

    return (
        <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${dotColor}`} />
            <span className="text-sm text-gray-600 tabular-nums">{score}</span>
        </div>
    );
}

/**
 * Get styling based on reputation score
 */
function getReputationStyle(score: number): {
    color: string;
    bgColor: string;
    dotColor: string;
    label: string;
} {
    if (score >= 90) {
        return {
            color: "text-green-700",
            bgColor: "bg-green-100",
            dotColor: "bg-green-500",
            label: "Excelente",
        };
    }
    if (score >= 70) {
        return {
            color: "text-yellow-700",
            bgColor: "bg-yellow-100",
            dotColor: "bg-yellow-500",
            label: "Bueno",
        };
    }
    if (score >= 50) {
        return {
            color: "text-orange-700",
            bgColor: "bg-orange-100",
            dotColor: "bg-orange-500",
            label: "Regular",
        };
    }
    return {
        color: "text-red-700",
        bgColor: "bg-red-100",
        dotColor: "bg-red-500",
        label: "Necesita Mejorar",
    };
}

/**
 * Get reputation score description for tooltips
 */
export function getReputationDescription(score: number): string {
    if (score >= 90) return "Usuario ejemplar sin infracciones";
    if (score >= 70) return "Buen historial con pequeñas observaciones";
    if (score >= 50) return "Algunas infracciones registradas";
    return "Múltiples infracciones - requiere atención";
}
