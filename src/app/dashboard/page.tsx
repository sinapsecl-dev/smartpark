import ParkingGrid from '@/components/parking/ParkingGrid';
import { createServerComponentClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserProfileCard } from '@/components/UserProfileCard';
import { MobileHeader } from '@/components/dashboard/MobileHeader';

export default async function DashboardPage() {
  const supabase = await createServerComponentClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile to get unit_id, role, and profile_completed status
  const { data: userProfile, error: profileError } = await (supabase
    .from('users') as unknown as { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: { unit_id: string; role: string; profile_completed: boolean } | null; error: unknown }> } } })
    .select('unit_id, role, profile_completed')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile) {
    console.error('Error fetching user profile:', profileError);
    redirect('/onboarding');
  }

  // Force users to complete profile before accessing dashboard
  if (!userProfile.profile_completed) {
    redirect('/complete-profile');
  }

  if (userProfile.role === 'admin') {
    redirect('/admin');
  }

  return (
    <main className="flex-1 w-full px-4 sm:px-8 lg:px-40 py-6 sm:py-8 flex justify-center">
      <div className="flex flex-col w-full max-w-[1200px] gap-6 sm:gap-8">

        {/* Mobile: Compact Header */}
        <div className="lg:hidden mb-2">
          <MobileHeader userId={user.id} initialEmail={user.email || ''} />
        </div>

        {/* Main Content Grid */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

          {/* Desktop: Sidebar with User Profile */}
          <aside className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="sticky top-24">
              <UserProfileCard userId={user.id} initialEmail={user.email || ''} />
            </div>
          </aside>

          {/* Main Parking Area */}
          <div className="flex-1 min-w-0">
            {/* Page Heading & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 border-b border-[#e7f0f4] dark:border-[#2a3b45] pb-4 md:pb-6">
              <div className="flex flex-col gap-1.5 md:gap-2">
                <h1 className="text-[#0d171c] dark:text-white text-2xl md:text-3xl lg:text-4xl font-black leading-tight tracking-[-0.033em]">
                  Estacionamiento de Visitas
                </h1>
                <p className="text-[#49829c] dark:text-[#a0bfce] text-sm md:text-base font-normal">
                  Selecciona un espacio disponible para reservar
                </p>
              </div>
              <button className="flex items-center justify-center rounded-lg h-9 md:h-10 px-3 md:px-4 bg-[#e7f0f4] dark:bg-[#2a3b45] text-[#0d171c] dark:text-white hover:bg-[#dbe6eb] dark:hover:bg-[#354855] transition-colors gap-2 text-xs md:text-sm font-bold tracking-[0.015em]">
                <span className="material-symbols-outlined text-[18px] md:text-[20px]">report_problem</span>
                <span>Reportar Problema</span>
              </button>
            </div>

            {/* Legend - Scrollable on mobile */}
            <div className="flex overflow-x-auto py-4 gap-2 sm:gap-3 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-medium whitespace-nowrap">Disponible</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <span className="text-red-800 dark:text-red-200 text-xs sm:text-sm font-medium whitespace-nowrap">Ocupado</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                <span className="text-amber-800 dark:text-amber-200 text-xs sm:text-sm font-medium whitespace-nowrap">Reservado</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                <span className="text-primary text-xs sm:text-sm font-medium whitespace-nowrap">Mi Reserva</span>
              </div>
            </div>

            {/* Parking Grid */}
            <div className="mt-2 sm:mt-4">
              <ParkingGrid userUnitId={userProfile.unit_id!} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}