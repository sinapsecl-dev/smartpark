import { createServerComponentClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import UsersPageClient from './UsersPageClient';

export default async function UsersPage() {
    const supabase = await createServerComponentClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch user profile to verify admin role
    const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('role, condominium_id')
        .eq('id', user.id)
        .single();

    if (profileError || !userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'developer')) {
        redirect('/dashboard');
    }

    // Fetch all ACTIVE/Regular users in the condominium (excluding self-registered pending)
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*, units(name)')
        .eq('condominium_id', userProfile.condominium_id)
        .in('status', ['active', 'suspended'])
        .order('created_at', { ascending: false });

    if (usersError) {
        console.error('Error fetching users:', usersError);
    }

    // Fetch admin-invited pending users (pending users with invited_by NOT NULL)
    const { data: invitedPending, error: invitedError } = await supabase
        .from('users')
        .select('*, units(name)')
        .eq('condominium_id', userProfile.condominium_id)
        .eq('status', 'pending')
        .not('invited_by', 'is', null)
        .order('created_at', { ascending: false });

    if (invitedError) {
        console.error('Error fetching invited pending users:', invitedError);
    }

    // Fetch SELF-REGISTERED pending users (pending users with invited_by IS NULL)
    const { data: selfRegisteredPending, error: selfRegError } = await supabase
        .from('users')
        .select('*')
        .eq('condominium_id', userProfile.condominium_id)
        .eq('status', 'pending')
        .is('invited_by', null)
        .order('created_at', { ascending: false });

    if (selfRegError) {
        console.error('Error fetching self-registered pending users:', selfRegError);
    }

    // Fetch available units for user creation
    const { data: units } = await supabase
        .from('units')
        .select('id, name')
        .eq('condominium_id', userProfile.condominium_id)
        .order('name');

    // Transform active/suspended users
    const transformedUsers = (users || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        phone: u.phone,
        role: u.role,
        userType: u.user_type,
        status: u.status,
        unitId: u.unit_id,
        unitName: u.units?.name || null,
        profileCompleted: u.profile_completed,
        createdAt: u.created_at,
    }));

    // Transform admin-invited pending users
    const transformedInvitedPending = (invitedPending || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        phone: u.phone,
        role: u.role,
        userType: u.user_type,
        status: u.status,
        unitId: u.unit_id,
        unitName: u.units?.name || null,
        profileCompleted: u.profile_completed,
        createdAt: u.created_at,
    }));

    // Transform self-registered pending users (for Solicitudes tab)
    const transformedSelfRegistered = (selfRegisteredPending || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        phone: u.phone,
        createdAt: u.created_at,
    }));

    return (
        <UsersPageClient
            initialUsers={transformedUsers}
            pendingInvitedUsers={transformedInvitedPending}
            selfRegisteredPending={transformedSelfRegistered}
            availableUnits={units || []}
            condominiumId={userProfile.condominium_id}
        />
    );
}
