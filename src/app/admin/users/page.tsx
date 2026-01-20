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

    if (profileError || !userProfile || userProfile.role !== 'admin') {
        redirect('/dashboard');
    }

    // Fetch all users in the condominium
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*, units(name)')
        .eq('condominium_id', userProfile.condominium_id)
        .order('created_at', { ascending: false });

    if (usersError) {
        console.error('Error fetching users:', usersError);
    }

    // Fetch pending registrations
    const { data: pendingRegistrations, error: pendingError } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('condominium_id', userProfile.condominium_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (pendingError) {
        console.error('Error fetching pending registrations:', pendingError);
    }

    // Fetch available units for user creation
    const { data: units } = await supabase
        .from('units')
        .select('id, name')
        .eq('condominium_id', userProfile.condominium_id)
        .order('name');

    // Transform users data
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

    // Transform pending registrations
    const transformedPending = (pendingRegistrations || []).map((p: any) => ({
        id: p.id,
        email: p.email,
        fullName: p.full_name,
        phone: p.phone,
        requestedUnitName: p.requested_unit_name,
        userType: p.user_type,
        status: p.status,
        createdAt: p.created_at,
    }));

    return (
        <UsersPageClient
            initialUsers={transformedUsers}
            pendingRegistrations={transformedPending}
            availableUnits={units || []}
            condominiumId={userProfile.condominium_id}
        />
    );
}
