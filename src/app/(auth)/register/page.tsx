import { createServerComponentClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RegisterPageClient from './RegisterPageClient';

export default async function RegisterPage() {
    const supabase = await createServerComponentClient();

    // Check if user is already logged in
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // Check if user profile is complete
        const { data: profile } = await supabase
            .from('users')
            .select('profile_completed, role')
            .eq('id', user.id)
            .single();

        if (profile) {
            if (!profile.profile_completed) {
                redirect('/complete-profile');
            } else if (profile.role === 'admin') {
                redirect('/admin');
            } else {
                redirect('/dashboard');
            }
        }
    }

    return <RegisterPageClient />;
}
