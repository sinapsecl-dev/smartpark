'use client';

import { useState, useCallback } from 'react';
import { UserAvatar, type AvatarStyle } from './UserAvatar';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import clsx from 'clsx';

const AVATAR_STYLES: { id: AvatarStyle; name: string; description: string }[] = [
    { id: 'bottts', name: 'Robots', description: 'Simpáticos robots' },
    { id: 'pixel-art', name: 'Pixel', description: 'Estilo retro pixelado' },
    { id: 'avataaars', name: 'Cartoon', description: 'Avatares personalizables' },
    { id: 'fun-emoji', name: 'Emoji', description: 'Emojis divertidos' },
    { id: 'lorelei', name: 'Lorelei', description: 'Ilustraciones elegantes' },
    { id: 'notionists', name: 'Notion', description: 'Estilo minimalista' },
];

interface AvatarStyleSelectorProps {
    currentStyle: AvatarStyle;
    currentSeed: string;
    onStyleChange: (style: string, seed: string) => void;
}

/**
 * Avatar style selector with preview and randomize functionality.
 */
export function AvatarStyleSelector({
    currentStyle,
    currentSeed,
    onStyleChange,
}: AvatarStyleSelectorProps) {
    const [selectedStyle, setSelectedStyle] = useState<AvatarStyle>(currentStyle);
    const [seed, setSeed] = useState(currentSeed);

    const handleRandomize = useCallback(() => {
        const newSeed = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        setSeed(newSeed);
    }, []);

    const handleStyleSelect = useCallback((style: AvatarStyle) => {
        setSelectedStyle(style);
    }, []);

    const handleConfirm = useCallback(() => {
        onStyleChange(selectedStyle, seed);
    }, [selectedStyle, seed, onStyleChange]);

    return (
        <div className="space-y-6">
            {/* Preview */}
            <div className="flex flex-col items-center gap-4">
                <UserAvatar
                    userId={seed}
                    style={selectedStyle}
                    seed={seed}
                    size="xl"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRandomize}
                    className="gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Aleatorio
                </Button>
            </div>

            {/* Style Grid */}
            <div className="grid grid-cols-3 gap-3">
                {AVATAR_STYLES.map((style) => (
                    <button
                        key={style.id}
                        type="button"
                        onClick={() => handleStyleSelect(style.id)}
                        className={clsx(
                            'flex flex-col items-center gap-2 p-3 rounded-xl transition-all',
                            'border-2 hover:bg-gray-50 dark:hover:bg-gray-800',
                            selectedStyle === style.id
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 dark:border-gray-700'
                        )}
                    >
                        <UserAvatar
                            userId={seed}
                            style={style.id}
                            seed={seed}
                            size="md"
                        />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {style.name}
                        </span>
                    </button>
                ))}
            </div>

            {/* Confirm Button */}
            <Button
                type="button"
                onClick={handleConfirm}
                className="w-full"
            >
                Confirmar Avatar
            </Button>
        </div>
    );
}
