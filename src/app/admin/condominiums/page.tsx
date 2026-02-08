import { createServerComponentClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminCondominiumsClient from './AdminCondominiumsClient';
import { getCondominiums } from '@/app/lib/developer-actions';

export const dynamic = 'force-dynamic';

export default async function AdminCondominiumsPage() {
    const supabase = await createServerComponentClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Role check
    const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (userProfile?.role !== 'developer') {
        redirect('/admin');
    }

    // Fetch condominiums
    let condominiums: any[] = [];
    try {
        condominiums = await getCondominiums();
    } catch (e) {
        console.error('Error fetching condominiums:', e);
    }

    return (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Gestión de Condominios
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Panel de Super Administrador
                </p>
            </div>

            <AdminCondominiumsClient initialCondominiums={condominiums} />
        </div>
    );
}
