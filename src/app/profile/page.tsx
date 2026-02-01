import { getProfile } from '@/app/actions/profile';
import { redirect } from 'next/navigation';
import ProfilePageClient from './ProfilePageClient';

export default async function ProfilePage() {
    const profile = await getProfile();

    if (!profile) {
        redirect('/login');
    }

    return <ProfilePageClient profile={profile} />;
}
