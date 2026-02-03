import Link from 'next/link';
import { createServerComponentClient } from '@/lib/supabase/server';
import { Enums } from '@/types/supabase';
import NavLinks from './NavLinks';
import AuthButton from '@/components/shared/AuthButton';

export default async function Navbar() {
  const supabase = await createServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userHouseNumber: string | null = null;
  let userRole: Enums<'user_role'> | null = null;

  if (user) {
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, units(name)')
      .eq('id', user.id)
      .single();

    if (userProfile) {
      userRole = userProfile.role;
      if (userProfile.units) {
        // @ts-ignore - Supabase type inference for joined tables can be tricky
        userHouseNumber = userProfile.units.name;
      }
    } else if (profileError) {
      console.error('Error fetching user profile for Navbar:', JSON.stringify(profileError, null, 2));
    }
  }

  const isAdmin = userRole === 'admin';

  return (
    <header className="w-full bg-white dark:bg-[#1a262d] border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
      {/* Main navbar container */}
      <div className="px-4 sm:px-6 lg:px-10 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">

          {/* Logo & Brand */}
          <Link
            href={isAdmin ? '/admin' : '/dashboard'}
            className="flex items-center gap-2.5 group flex-shrink-0"
          >
            {/* Logo Icon */}
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
              <span className="material-symbols-outlined text-white text-[20px] sm:text-[22px]">
                local_parking
              </span>
            </div>

            {/* Brand Text */}
            <div className="hidden sm:block">
              <h1 className="text-[#0d171c] dark:text-white text-lg sm:text-xl font-bold leading-tight tracking-tight">
                SinaPark
              </h1>
              {isAdmin && (
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  Admin
                </span>
              )}
            </div>
          </Link>

          {/* Center: Desktop Navigation */}
          <div className="hidden md:flex flex-1 justify-center">
            <NavLinks
              userRole={userRole}
              userHouseNumber={userHouseNumber}
              userEmail={user?.email}
            />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop User Info */}
            {user && (
              <div className="hidden md:flex items-center gap-3">
                {/* User Badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[14px]">
                      {isAdmin ? 'admin_panel_settings' : 'home'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[120px] truncate">
                    {isAdmin ? 'Admin' : userHouseNumber || 'Residente'}
                  </span>
                </div>

                {/* Logout Button (Client Component) */}
                <AuthButton />
              </div>
            )}

            {/* Mobile: Hamburger Menu */}
            <div className="md:hidden">
              <NavLinks
                userRole={userRole}
                userHouseNumber={userHouseNumber}
                userEmail={user?.email}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gradient line at bottom */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </header>
  );
}
