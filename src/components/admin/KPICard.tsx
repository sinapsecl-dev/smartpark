'use client';

import React from 'react';
import { m } from 'framer-motion';
import clsx from 'clsx';

interface KPICardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    iconColorClass?: string;
    badge?: {
        text: string;
        type: 'success' | 'warning' | 'danger' | 'info';
    };
    progress?: number;
    actionButton?: {
        label: string;
        onClick: () => void;
    };
    variant?: 'default' | 'alert';
    compact?: boolean;
}

const badgeStyles = {
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const iconBgStyles = {
    default: 'bg-primary/10',
    alert: 'bg-red-100 dark:bg-red-900/30',
};

const KPICard: React.FC<KPICardProps> = ({
    title,
    value,
    subtitle,
    icon,
    iconColorClass = 'text-primary',
    badge,
    progress,
    actionButton,
    variant = 'default',
    compact = false,
}) => {
    return (
        <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={clsx(
                'flex flex-col rounded-xl bg-white dark:bg-[#1a2c35] shadow-sm border relative overflow-hidden',
                'transition-all duration-200 touch-manipulation',
                compact ? 'p-4' : 'p-4 sm:p-6',
                variant === 'alert'
                    ? 'border-red-200 dark:border-red-900/50'
                    : 'border-gray-100 dark:border-gray-700 hover:border-primary/30'
            )}
        >
            {/* Corner decoration for alert variant */}
            {variant === 'alert' && (
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-red-100 to-transparent dark:from-red-900/20 rounded-bl-full -mr-4 -mt-4" />
            )}

            {/* Header - Mobile optimized */}
            <div className="flex items-start sm:items-center justify-between gap-2 mb-3 sm:mb-4 relative z-10">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className={clsx(
                        'flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center',
                        iconBgStyles[variant]
                    )}>
                        <span className={clsx('material-symbols-outlined text-[20px] sm:text-[22px]', iconColorClass)}>
                            {icon}
                        </span>
                    </div>
                    <p className="text-[#0d171c] dark:text-gray-200 text-sm sm:text-base font-semibold truncate">
                        {title}
                    </p>
                </div>
                {badge && (
                    <span className={clsx(
                        'flex-shrink-0 text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap',
                        badgeStyles[badge.type]
                    )}>
                        {badge.text}
                    </span>
                )}
            </div>

            {/* Value - Responsive sizing */}
            <div className="flex items-baseline gap-2 mt-auto relative z-10">
                <m.p
                    key={String(value)}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-[#0d171c] dark:text-white text-3xl sm:text-4xl font-bold leading-none"
                >
                    {value}
                </m.p>
                {subtitle && (
                    <p className="text-[#49829c] dark:text-gray-400 text-xs sm:text-sm font-medium">
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Progress bar - Thicker on mobile for visibility */}
            {progress !== undefined && (
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5 mt-3 sm:mt-4 dark:bg-gray-700 overflow-hidden">
                    <m.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={clsx(
                            'h-full rounded-full',
                            progress > 90 ? 'bg-red-500' : progress > 70 ? 'bg-amber-500' : 'bg-primary'
                        )}
                    />
                </div>
            )}

            {/* Action button - Larger touch target on mobile */}
            {actionButton && (
                <m.button
                    whileTap={{ scale: 0.95 }}
                    onClick={actionButton.onClick}
                    className={clsx(
                        'mt-3 sm:mt-4 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold',
                        'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
                        'hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors',
                        'touch-manipulation active:scale-95'
                    )}
                >
                    {actionButton.label}
                </m.button>
            )}
        </m.div>
    );
};

export default KPICard;
