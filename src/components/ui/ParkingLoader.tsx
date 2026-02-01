'use client';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import clsx from 'clsx';
import { DotLottiePlayer } from '@dotlottie/react-player';

interface ParkingLoaderProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    fullScreen?: boolean;
    className?: string;
}

/**
 * Fallback spinner for when Lottie is loading or unavailable
 */
function FallbackSpinner() {
    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative">
                <div className="w-12 h-12 border-4 border-primary/20 rounded-full" />
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-primary rounded-full animate-spin" />
            </div>
        </div>
    );
}

/**
 * Parking-themed loading component with Lottie animation.
 * Falls back to CSS spinner if Lottie fails or user prefers reduced motion.
 */
export function ParkingLoader({
    size = 'md',
    text = 'Cargando...',
    fullScreen = false,
    className
}: ParkingLoaderProps) {
    const prefersReducedMotion = useReducedMotion();

    const sizeMap = {
        sm: { width: 80, height: 80 },
        md: { width: 150, height: 150 },
        lg: { width: 220, height: 220 },
    };

    const dimensions = sizeMap[size];

    const content = (
        <div className={clsx(
            'flex flex-col items-center justify-center gap-3',
            className
        )}>
            {prefersReducedMotion ? (
                <FallbackSpinner />
            ) : (
                <div style={{ width: dimensions.width, height: dimensions.height }}>
                    <DotLottiePlayer
                        src="/animations/carr.lottie"
                        loop
                        autoplay
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
            )}

            {text && (
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-[#101c22]/80 backdrop-blur-sm">
                {content}
            </div>
        );
    }

    return content;
}

export default ParkingLoader;
