import { createServerComponentClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CompleteProfileClient from './CompleteProfileClient';

export const dynamic = 'force-dynamic';

export default async function CompleteProfilePage() {
    const supabase = await createServerComponentClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Check if user already has a profile
    const { data: existingProfile } = await supabase
        .from('users')
        .select('id, profile_completed, role, condominium_id, auth_provider, invited_by, full_name, phone, user_type, unit_id')
        .eq('id', user.id as any)
        .single();

    // Cast to any for type safety with generated types
    const profile = existingProfile as any;

    // If profile is already complete, redirect to appropriate dashboard
    if (profile?.profile_completed) {
        if (profile.role === 'admin') {
            redirect('/admin');
        }
        redirect('/dashboard');
    }

    // Get user metadata from invitation (if available)
    const userMetadata = user.user_metadata || {};
    const condominiumId = userMetadata.condominium_id || profile?.condominium_id;
    const unitId = userMetadata.unit_id || profile?.unit_id;
    const unitName = userMetadata.unit_name;

    // Determine if user needs to set a password:
    // - Admin-invited users (invited_by IS NOT NULL from user_metadata) need to set password
    // - Self-registered users (invited_by IS NULL in profile initially) already have password
    // - Users with auth_provider = 'google' don't need password
    // Check if user was invited by admin (came through invitation email)
    const wasInvitedByAdmin = userMetadata.invited_by !== undefined || (profile?.invited_by !== null && profile?.auth_provider !== 'email');
    const isGoogleUser = user.app_metadata?.provider === 'google' || profile?.auth_provider === 'google';

    // Self-registered users already set password during registration
    // They will have profile with invited_by = NULL initially (before approval)
    // After approval, invited_by gets set to admin ID, but auth_provider should be 'email'
    // Key distinction: self-registered users have auth_provider = 'email' from the start
    const needsPassword = wasInvitedByAdmin && !isGoogleUser;

    // Get available units if no unit assigned
    let availableUnits: { id: string; name: string }[] = [];
    if (condominiumId && !unitId) {
        const { data: units } = await supabase
            .from('units')
            .select('id, name')
            .eq('condominium_id', condominiumId as any)
            .order('name');
        availableUnits = (units as any) || [];
    }

    return (
        <CompleteProfileClient
            userEmail={user.email || ''}
            userId={user.id}
            condominiumId={condominiumId}
            preassignedUnitId={unitId}
            preassignedUnitName={unitName}
            availableUnits={availableUnits}
            existingProfile={profile}
            needsPassword={needsPassword}
            existingFullName={profile?.full_name}
            existingPhone={profile?.phone}
            existingUserType={profile?.user_type}
        />
    );
}

