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
        .select('id, profile_completed, role, condominium_id')
        .eq('id', user.id)
        .single();

    // If profile is already complete, redirect to appropriate dashboard
    if (existingProfile?.profile_completed) {
        if (existingProfile.role === 'admin') {
            redirect('/admin');
        }
        redirect('/dashboard');
    }

    // Get user metadata from invitation (if available)
    const userMetadata = user.user_metadata || {};
    const condominiumId = userMetadata.condominium_id || existingProfile?.condominium_id;
    const unitId = userMetadata.unit_id;
    const unitName = userMetadata.unit_name;

    // Get available units if no unit assigned
    let availableUnits: { id: string; name: string }[] = [];
    if (condominiumId && !unitId) {
        const { data: units } = await supabase
            .from('units')
            .select('id, name')
            .eq('condominium_id', condominiumId)
            .order('name');
        availableUnits = units || [];
    }

    return (
        <CompleteProfileClient
            userEmail={user.email || ''}
            userId={user.id}
            condominiumId={condominiumId}
            preassignedUnitId={unitId}
            preassignedUnitName={unitName}
            availableUnits={availableUnits}
            existingProfile={existingProfile}
        />
    );
}
