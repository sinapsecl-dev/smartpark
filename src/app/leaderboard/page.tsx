import { createServerComponentClient } from "@/lib/supabase/server";
import { XPProgressBar } from "@/components/XPProgressBar";
import { UserAvatar, AvatarStyle } from "@/components/gamification/UserAvatar";
import { ReputationBadge } from "@/components/ReputationBadge";
import { getLevelName } from "@/lib/gamification";
import { Medal, TrendingUp, Users } from "lucide-react";

export const metadata = {
    title: "Leaderboard - SmartParking",
    description: "Tabla de clasificación de usuarios",
};

interface LeaderboardUser {
    user_id: string;
    total_xp: number;
    level: number;
    email?: string;
    full_name?: string;
    avatar_seed?: string;
    avatar_style?: AvatarStyle;
    reputation_score?: number;
}

export default async function LeaderboardPage() {
    const supabase = await createServerComponentClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch top 50 users by XP with their profiles and reputation
    // Using three parallel queries for efficiency
    const [xpLeaders, currentUserRank] = await Promise.all([
        supabase.rpc("get_leaderboard_with_details" as never, { limit_count: 50 } as never),
        user ? supabase.rpc("get_user_rank" as never, { user_id: user.id } as never) : null,
    ]);

    // Fallback: Direct query if RPC not available
    let leaderboardData: LeaderboardUser[] = [];

    if (xpLeaders.error) {
        // Direct query fallback
        const { data } = await supabase
            .from("user_experience" as never)
            .select("user_id, total_xp, level" as never)
            .order("total_xp" as never, { ascending: false } as never)
            .limit(50);

        leaderboardData = (data as unknown as LeaderboardUser[]) ?? [];
    } else {
        leaderboardData = (xpLeaders.data as unknown as LeaderboardUser[]) ?? [];
    }

    const userRank = (currentUserRank?.data as unknown as number) ?? null;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-2xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-lg mb-4">
                        <Medal className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Tabla de Clasificación</h1>
                    <p className="text-gray-600 mt-1">Top 50 usuarios más activos</p>
                </div>

                {/* User's current rank card */}
                {user && userRank && (
                    <div className="bg-gradient-to-r from-sky-500 to-sky-600 rounded-xl p-4 mb-6 text-white shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                                {userRank}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-white/80">Tu posición actual</p>
                                <p className="font-semibold">¡Estás en el top {Math.round((userRank / leaderboardData.length) * 100)}%!</p>
                            </div>
                            <TrendingUp className="w-6 h-6 text-white/70" />
                        </div>
                    </div>
                )}

                {/* Stats summary */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Users className="w-4 h-4" />
                    <span>{leaderboardData.length} usuarios clasificados</span>
                </div>

                {/* Leaderboard list */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {leaderboardData.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No hay datos de clasificación disponibles
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {leaderboardData.map((leader, index) => (
                                <li
                                    key={leader.user_id}
                                    className={`flex items-center gap-4 p-4 ${user?.id === leader.user_id ? "bg-sky-50" : ""
                                        } ${index < 3 ? "bg-gradient-to-r from-yellow-50 to-transparent" : ""}`}
                                >
                                    {/* Rank */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? "bg-yellow-400 text-yellow-900" :
                                        index === 1 ? "bg-gray-300 text-gray-700" :
                                            index === 2 ? "bg-orange-400 text-orange-900" :
                                                "bg-gray-100 text-gray-600"
                                        }`}>
                                        {index + 1}
                                    </div>

                                    {/* Avatar */}
                                    <UserAvatar
                                        userId={leader.user_id}
                                        seed={leader.avatar_seed ?? leader.user_id}
                                        style={leader.avatar_style ?? 'bottts'}
                                        size="md"
                                    />

                                    {/* User info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">
                                            {leader.full_name ?? "Usuario"}
                                            {user?.id === leader.user_id && (
                                                <span className="ml-2 text-xs text-sky-600 font-normal">(Tú)</span>
                                            )}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Lv.{leader.level} • {getLevelName(leader.level)}
                                        </p>
                                    </div>

                                    {/* Reputation badge */}
                                    {leader.reputation_score !== undefined && (
                                        <ReputationBadge score={leader.reputation_score} size="sm" showLabel={false} />
                                    )}

                                    {/* XP */}
                                    <div className="text-right">
                                        <p className="font-semibold text-gray-900 tabular-nums">
                                            {leader.total_xp.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-500">XP</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
