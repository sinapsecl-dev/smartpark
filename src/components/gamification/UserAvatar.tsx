'use client';

import { useMemo } from 'react';
import clsx from 'clsx';

// Avatar style types supported (using DiceBear v7 names)
export type AvatarStyle = 'bottts' | 'pixel-art' | 'avataaars' | 'fun-emoji' | 'lorelei' | 'notionists';

interface UserAvatarProps {
    userId: string;
    style?: AvatarStyle;
    seed?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

/**
 * User avatar component using DiceBear API.
 * Generates unique avatars based on user ID and style.
 */
export function UserAvatar({
    userId,
    style = 'bottts',
    seed,
    size = 'md',
    className,
}: UserAvatarProps) {
    const avatarSeed = seed || userId;

    const sizeMap = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24',
    };

    const avatarUrl = useMemo(() => {
        return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(avatarSeed)}`;
    }, [style, avatarSeed]);

    return (
        <div
            className={clsx(
                'rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0',
                sizeMap[size],
                className
            )}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
                loading="lazy"
            />
        </div>
    );
}
