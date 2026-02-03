
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createMvpUsers() {
    console.log('Starting MVP User Creation...');

    // 0. Fetch Default Condominium
    const { data: condo, error: condoError } = await supabase
        .from('condominiums')
        .select('id')
        .eq('name', 'Terrazas del Sol V')
        .single();

    if (condoError || !condo) {
        console.error('Error: Default Condominium "Terrazas del Sol V" not found. Run SQL migrations first (or check 02_condominiums...sql).');
        // Fallback: If migration 02 ran, the ID is fixed: a0000000-0000-0000-0000-000000000001
        // But better to fail if DB is empty.
        return;
    }

    const CONDO_ID = condo.id;
    console.log(`Found Condominium ID: ${CONDO_ID}`);

    // 1. Create Admin User
    const adminEmail = 'terrazasdelsolvadm@gmail.com';
    const adminPassword = 'terrazasdelsolv';

    console.log(`Creating Admin: ${adminEmail}`);

    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
            full_name: 'Administrador',
            condominium_id: CONDO_ID, // Required for Trigger to create public.users
            role: 'admin'
        }
    });

    let adminId;

    if (adminError) {
        if (adminError.message.includes('already registered')) {
            console.log('Admin already exists, fetching ID...');
            const { data: users } = await supabase.auth.admin.listUsers();
            const found = users.users.find((u: any) => u.email === adminEmail);
            if (found) adminId = found.id;
        } else {
            console.error('Error creating admin:', adminError);
        }
    } else {
        adminId = adminData.user.id;
        console.log('Admin created with ID:', adminId);
    }

    if (adminId) {
        // Forcefully update public.users to ensure Role and Profile Completed
        // We use UPSERT in case trigger failed, or UPDATE if it exists.
        // Ideally user exists.

        // We'll try UPDATE first.
        const { error: roleError } = await supabase
            .from('users')
            .update({
                role: 'admin',
                full_name: 'Administrador',
                profile_completed: true, // BYPASS ONBOARDING
                condominium_id: CONDO_ID,
                status: 'active'
            })
            .eq('id', adminId);

        // If rolesError (row count 0?), we might need to INSERT manually if trigger failed completely?
        // But trigger SHOULD fire now that we have condo_id.

        if (roleError) console.error('Error setting admin role/profile:', roleError);
        else console.log('Admin role and profile set successfully.');
    }

    // 2. Create Resident User
    const residentEmail = 'residente@terrazas.com';

    console.log(`Creating Resident: ${residentEmail}`);

    const { data: resData, error: resError } = await supabase.auth.admin.createUser({
        email: residentEmail,
        password: 'residente123',
        email_confirm: true,
        user_metadata: {
            full_name: null,
            condominium_id: CONDO_ID,
            role: 'resident'
        }
    });

    let resId;

    if (resError) {
        if (resError.message.includes('already registered')) {
            console.log('Resident already exists, fetching ID...');
            const { data: users } = await supabase.auth.admin.listUsers();
            const found = users.users.find((u: any) => u.email === residentEmail);
            if (found) resId = found.id;
        } else {
            console.error('Error creating resident:', resError);
        }
    } else {
        resId = resData.user.id;
        console.log('Resident created with ID:', resId);
    }

    if (resId) {
        // Assign to 'Casa 1'
        const { data: unit } = await supabase.from('units').select('id').eq('name', 'Casa 1').single();

        if (unit) {
            // Resident: Profile Incomplete, but Active.
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    role: 'resident',
                    unit_id: unit.id,
                    status: 'active', // Ensure active
                    condominium_id: CONDO_ID,
                    // profile_completed: false // Default is false, which is what we want for testing flow
                })
                .eq('id', resId);

            if (updateError) console.error('Error updating resident:', updateError);
            else console.log('Resident assigned to Casa 1 and set to Active.');
        } else {
            console.error('Error: "Casa 1" unit not found. Did you run the SQL seed?');
        }
    }

    console.log('Done.');
}

createMvpUsers().catch(console.error);
