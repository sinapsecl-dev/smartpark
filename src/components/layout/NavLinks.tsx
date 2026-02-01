'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Enums } from '@/types/supabase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { m, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronRight, LogOut, Trophy } from 'lucide-react';
import { createClientComponentClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface NavLinksProps {
  userRole: Enums<'user_role'> | null;
  userHouseNumber: string | null;
  userEmail: string | undefined;
}

interface NavLink {
  href: string;
  label: string;
  icon: string;
  description?: string;
}

const adminLinks: NavLink[] = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard', description: 'Vista general y métricas' },
  { href: '/admin/settings', label: 'Configuración', icon: 'settings', description: 'Reglas y ajustes' },
  { href: '/admin/units', label: 'Unidades', icon: 'apartment', description: 'Gestión de unidades' },
  { href: '/admin/users', label: 'Usuarios', icon: 'group', description: 'Gestión de residentes' },
  { href: '/admin/audit-logs', label: 'Auditoría', icon: 'history', description: 'Registro de actividades' },
];

const residentLinks: NavLink[] = [
  { href: '/dashboard', label: 'Estacionamientos', icon: 'local_parking', description: 'Ver y reservar' },
  { href: '/leaderboard', label: 'Clasificación', icon: 'leaderboard', description: 'Top usuarios y logros' },
  { href: '/profile', label: 'Perfil', icon: 'person', description: 'Tu cuenta y avatar' },
];

// Desktop Navigation Link
const DesktopNavLink: React.FC<{ link: NavLink; isActive: boolean }> = ({ link, isActive }) => (
  <Link
    href={link.href}
    className={clsx(
      'relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
      'hover:bg-gray-100 dark:hover:bg-gray-800',
      isActive
        ? 'text-primary bg-primary/5'
        : 'text-gray-600 dark:text-gray-300'
    )}
  >
    <span className={clsx(
      'material-symbols-outlined text-[18px]',
      isActive ? 'text-primary' : 'text-gray-400'
    )}>
      {link.icon}
    </span>
    {link.label}
    {isActive && (
      <m.div
        layoutId="activeIndicator"
        className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full"
      />
    )}
  </Link>
);

// Mobile Menu Item
const MobileMenuItem: React.FC<{
  link: NavLink;
  isActive: boolean;
  onClick: () => void;
  index: number;
}> = ({ link, isActive, onClick, index }) => (
  <m.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
  >
    <Link
      href={link.href}
      onClick={onClick}
      className={clsx(
        'flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200',
        'active:scale-98 touch-manipulation',
        isActive
          ? 'bg-primary/10 border-l-4 border-primary'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      )}
    >
      <div className={clsx(
        'w-10 h-10 rounded-lg flex items-center justify-center',
        isActive ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
      )}>
        <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx(
          'font-semibold text-sm',
          isActive ? 'text-primary' : 'text-gray-800 dark:text-white'
        )}>
          {link.label}
        </p>
        {link.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {link.description}
          </p>
        )}
      </div>
      <ChevronRight className={clsx(
        'w-4 h-4',
        isActive ? 'text-primary' : 'text-gray-300'
      )} />
    </Link>
  </m.div>
);

const NavLinks: React.FC<NavLinksProps> = ({ userRole, userHouseNumber, userEmail }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const links = userRole === 'admin' ? adminLinks : residentLinks;
  const supabase = createClientComponentClient();

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }, [supabase, router]);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-1">
        {links.map((link) => (
          <DesktopNavLink
            key={link.href}
            link={link}
            isActive={pathname === link.href}
          />
        ))}
      </nav>

      {/* Mobile Menu Button */}
      <button
        type="button"
        onClick={toggleMenu}
        className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors touch-manipulation"
        aria-label="Toggle menu"
      >
        <AnimatePresence mode="wait">
          <m.div
            key={isMenuOpen ? 'close' : 'menu'}
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            transition={{ duration: 0.15 }}
          >
            {isMenuOpen ? (
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            )}
          </m.div>
        </AnimatePresence>
      </button>

      {/* Mobile Overlay & Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMenu}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
            />

            {/* Drawer */}
            <m.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white dark:bg-[#1a262d] z-50 md:hidden shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      {userRole === 'admin' ? 'admin_panel_settings' : 'home'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-800 dark:text-white truncate">
                      {userRole === 'admin' ? 'Administrador' : userHouseNumber || 'Residente'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                  </div>
                </div>
                <button
                  onClick={closeMenu}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto py-4 px-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">
                  Navegación
                </p>
                <div className="space-y-1">
                  {links.map((link, index) => (
                    <MobileMenuItem
                      key={link.href}
                      link={link}
                      isActive={pathname === link.href}
                      onClick={closeMenu}
                      index={index}
                    />
                  ))}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-gray-100 dark:border-gray-700 p-4 safe-area-inset-bottom">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors touch-manipulation"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavLinks;
