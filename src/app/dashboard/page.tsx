import ParkingGrid from '@/components/parking/ParkingGrid';
import { createServerComponentClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createServerComponentClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login'); // Redirect unauthenticated users
  }

  // Fetch user profile to get unit_id and role
  const { data: userProfile, error: profileError } = await (supabase
    .from('users') as any) // Cast to any here
    .select('unit_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile) {
    console.error('Error fetching user profile:', profileError);
    // Depending on the error, might want to redirect to a profile setup page or error page
    redirect('/onboarding'); // Example: Redirect to an onboarding page
  }

  if (userProfile.role === 'admin') {
    redirect('/admin'); // Admins go to admin dashboard
  }

  return (
    <main className="flex-1 w-full px-4 sm:px-8 lg:px-40 py-8 flex justify-center">
      <div className="flex flex-col w-full max-w-[1200px] gap-8">
        {/* Page Heading & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-[#e7f0f4] dark:border-[#2a3b45] pb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-[#0d171c] dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
              Estacionamiento de Visitas
            </h1>
            <p className="text-[#49829c] dark:text-[#a0bfce] text-base font-normal">
              Selecciona un espacio disponible para reservar
            </p>
          </div>
          <button className="flex items-center justify-center rounded-lg h-10 px-4 bg-[#e7f0f4] dark:bg-[#2a3b45] text-[#0d171c] dark:text-white hover:bg-[#dbe6eb] dark:hover:bg-[#354855] transition-colors gap-2 text-sm font-bold tracking-[0.015em]">
            <span className="material-symbols-outlined text-[20px]">report_problem</span>
            <span>Reportar Problema</span>
          </button>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <span className="text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-medium">Disponible</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <span className="text-red-800 dark:text-red-200 text-xs sm:text-sm font-medium">Ocupado</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
            <span className="text-amber-800 dark:text-amber-200 text-xs sm:text-sm font-medium">Reservado</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
            <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
            <span className="text-primary text-xs sm:text-sm font-medium">Mi Reserva</span>
          </div>
        </div>
        {/* Parking Grid */}
        <ParkingGrid userUnitId={userProfile.unit_id!} />
      </div>
    </main>
  );
}