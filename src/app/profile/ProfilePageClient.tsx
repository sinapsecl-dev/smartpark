'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile, updateAvatar } from '@/app/actions/profile';
import { UserAvatar } from '@/components/gamification/UserAvatar';
import { AvatarStyleSelector } from '@/components/gamification/AvatarStyleSelector';
import { XPProgressBar } from '@/components/XPProgressBar';
import { AchievementList } from '@/components/gamification/AchievementList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { m } from 'framer-motion';
import { User, Phone, Palette, Save, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { AchievementDefinition, UserAchievement } from '@/types/gamification';

interface ProfilePageClientProps {
    profile: {
        id: string;
        email: string;
        full_name: string | null;
        phone: string | null;
        role: string;
        unit_id: string | null;
        units?: { name: string } | null;
        avatar: { style: string; seed: string };
        gamification?: {
            totalXP: number;
            level: number;
            definitions: AchievementDefinition[];
            userAchievements: UserAchievement[];
        };
    };
}

export default function ProfilePageClient({ profile }: ProfilePageClientProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form state
    const [fullName, setFullName] = useState(profile.full_name || '');
    const [phone, setPhone] = useState(profile.phone || '');

    // Avatar state
    const [avatarStyle, setAvatarStyle] = useState(profile.avatar.style);
    const [avatarSeed, setAvatarSeed] = useState(profile.avatar.seed);
    const [showAvatarSelector, setShowAvatarSelector] = useState(false);

    // Gamification state (real-time)
    const [xpStats, setXpStats] = useState({
        totalXP: profile.gamification?.totalXP || 0,
        level: profile.gamification?.level || 1
    });

    useEffect(() => {
        const handleXPUpdate = (event: CustomEvent<{ totalXP: number; level: number }>) => {
            console.log("ProfilePage: XP Update received", event.detail);
            setXpStats({
                totalXP: event.detail.totalXP,
                level: event.detail.level
            });
        };

        if (typeof window !== "undefined") {
            window.addEventListener("xp:update" as never, handleXPUpdate as EventListener);
        }

        return () => {
            if (typeof window !== "undefined") {
                window.removeEventListener("xp:update" as never, handleXPUpdate as EventListener);
            }
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append('full_name', fullName);
            formData.append('phone', phone);

            const result = await updateProfile(formData);

            if (result.success) {
                setMessage({ type: 'success', text: result.message });
            } else {
                setMessage({ type: 'error', text: result.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error inesperado.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAvatarChange = async (style: string, seed: string) => {
        setAvatarStyle(style);
        setAvatarSeed(seed);
        setShowAvatarSelector(false);

        const result = await updateAvatar(style, seed);
        if (result.success) {
            setMessage({ type: 'success', text: 'Avatar actualizado.' });
        }
    };

    return (
        <div className="min-h-screen bg-[#f0f4f8] dark:bg-[#101c22] py-6 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <m.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 mb-6"
                >
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-white dark:hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-[#0d171c] dark:text-white">
                            Mi Perfil
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Personaliza tu información y avatar
                        </p>
                    </div>
                </m.div>

                {/* Message */}
                {message && (
                    <m.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={clsx(
                            'mb-6 p-4 rounded-xl flex items-center gap-3',
                            message.type === 'success'
                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        )}
                    >
                        {message.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        ) : (
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        )}
                        <span>{message.text}</span>
                    </m.div>
                )}

                {/* Avatar Section */}
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-[#1e2a32] rounded-2xl p-6 shadow-sm mb-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-[#0d171c] dark:text-white">Avatar</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tu identidad visual</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <UserAvatar
                            userId={profile.id}
                            style={avatarStyle as "bottts" | "pixel-art" | "avataaars" | "fun-emoji" | "lorelei" | "notionists"}
                            seed={avatarSeed}
                            size="xl"
                        />

                        {/* XP Progress - Moved here */}
                        <div className="w-full max-w-sm mt-2 mb-2">
                            <XPProgressBar
                                currentXP={xpStats.totalXP}
                                level={xpStats.level}
                                showDetails={true}
                            />
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                            className="gap-2"
                        >
                            <Palette className="w-4 h-4" />
                            Cambiar Avatar
                        </Button>

                        {showAvatarSelector && (
                            <m.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="w-full mt-4"
                            >
                                <AvatarStyleSelector
                                    currentStyle={avatarStyle as "bottts" | "pixel-art" | "avataaars" | "fun-emoji" | "lorelei" | "notionists"}
                                    currentSeed={avatarSeed}
                                    onStyleChange={handleAvatarChange}
                                />
                            </m.div>
                        )}
                    </div>
                </m.div>

                {/* Achievements Section */}
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white dark:bg-[#1e2a32] rounded-2xl p-6 shadow-sm mb-6"
                >
                    <AchievementList
                        definitions={profile.gamification?.definitions || []}
                        userAchievements={profile.gamification?.userAchievements || []}
                    />
                </m.div>

                {/* Profile Form */}
                <m.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    onSubmit={handleSubmit}
                    className="bg-white dark:bg-[#1e2a32] rounded-2xl p-6 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-[#0d171c] dark:text-white">Información Personal</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza tus datos</p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {/* Email (read-only) */}
                        <div>
                            <Label htmlFor="email" className="text-gray-600 dark:text-gray-400">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={profile.email}
                                disabled
                                className="mt-1 bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-400 mt-1">El email no puede ser modificado</p>
                        </div>

                        {/* Full Name */}
                        <div>
                            <Label htmlFor="full_name" className="text-gray-600 dark:text-gray-400">
                                Nombre Completo <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative mt-1">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    id="full_name"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Tu nombre completo"
                                    className="pl-10"
                                    required
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <Label htmlFor="phone" className="text-gray-600 dark:text-gray-400">
                                Teléfono <span className="text-gray-400">(Opcional)</span>
                            </Label>
                            <div className="relative mt-1">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+56 9 1234 5678"
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* Unit Info (read-only) */}
                        {profile.units && (
                            <div>
                                <Label className="text-gray-600 dark:text-gray-400">
                                    Unidad Asignada
                                </Label>
                                <div className="mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300">
                                    {profile.units.name}
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full gap-2 bg-primary hover:bg-primary/90"
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Guardar Cambios
                                </>
                            )}
                        </Button>
                    </div>
                </m.form>
            </div>
        </div>
    );
}
