import { Database } from './supabase';

export type UserExperience = {
    id: string;
    user_id: string;
    total_xp: number;
    level: number;
    last_xp_gained_at: string | null;
    created_at: string;
    updated_at: string;
};

export type AchievementDefinition = {
    id: string;
    name: string;
    description: string;
    icon: string;
    xp_bonus: number;
    requirement_type: string;
    requirement_value: Record<string, any>;
    created_at: string;
    display_order: number;
    is_secret: boolean;
    category: 'core' | 'consistency' | 'social' | 'mastery' | 'community';
};

export type UserAchievement = {
    id: string;
    user_id: string;
    achievement_id: string;
    progress: number;
    unlocked_at: string | null;
    created_at: string;
    // Joined fields
    definition?: AchievementDefinition;
};

export type XPTransaction = {
    id: string;
    user_id: string;
    action_type: string;
    xp_amount: number;
    booking_id: string | null;
    metadata: Record<string, any> | null;
    created_at: string;
};

// Start of gamification specific types that might not be in the generated supabase types yet
export type GamificationDatabase = {
    public: {
        Tables: Database['public']['Tables'] & {
            user_experience: {
                Row: UserExperience;
                Insert: Omit<UserExperience, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<UserExperience, 'id' | 'created_at' | 'updated_at'>>;
            };
            achievements_definitions: {
                Row: AchievementDefinition;
                Insert: AchievementDefinition;
                Update: Partial<AchievementDefinition>;
            };
            user_achievements: {
                Row: UserAchievement;
                Insert: Omit<UserAchievement, 'id' | 'created_at'>;
                Update: Partial<Omit<UserAchievement, 'id' | 'created_at'>>;
            };
            xp_transactions: {
                Row: XPTransaction;
                Insert: Omit<XPTransaction, 'id' | 'created_at'>;
                Update: Partial<Omit<XPTransaction, 'id' | 'created_at'>>;
            };
        };
        Views: Database['public']['Views'];
        Functions: Database['public']['Functions'];
        Enums: Database['public']['Enums'];
        CompositeTypes: Database['public']['CompositeTypes'];
    };
}
