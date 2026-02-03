"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@/lib/supabase/client";
import { Flame } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";

interface LoginStreakProps {
    userId: string;
}

export function LoginStreak({ userId }: LoginStreakProps) {
    const [streak, setStreak] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        async function fetchStreak() {
            try {
                // En un caso real, esto vendría de una tabla 'user_streaks' o similar.
                // Simularemos buscando la última racha en 'user_experience' o metadata
                // Por ahora, para el MVP, usaremos un valor simulado almacenado en localStorage 
                // o consultaremos logs de login si existieran.

                // MVP: Fetch from user_metadata if available, else local mock logic
                const { data: { user } } = await supabase.auth.getUser();
                const metadata = user?.user_metadata || {};

                // Simulación de racha para demo si no hay datos reales de backend implementados aun para esto
                const mockStreak = metadata.login_streak || Math.floor(Math.random() * 5) + 1;

                setStreak(mockStreak);
            } catch (err) {
                console.error("Error fetching streak", err);
            } finally {
                setLoading(false);
            }
        }

        fetchStreak();
    }, [supabase, userId]);

    if (loading) return null;

    return (
        <div className="flex items-center gap-1 text-orange-500 font-bold text-xs" title="Racha de días seguidos">
            <m.div
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3
                }}
            >
                <Flame className="w-4 h-4 fill-orange-500" />
            </m.div>
            <span>{streak}</span>
        </div>
    );
}
