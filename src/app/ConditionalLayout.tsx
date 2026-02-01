'use client';

import { usePathname } from 'next/navigation';
import { m } from 'framer-motion';

/**
 * ConditionalLayout - Route-aware layout wrapper
 * Uses m component from framer-motion (requires LazyMotion parent).
 * Hides navbar on certain routes and provides smooth page transitions.
 */
export default function ConditionalLayout({
  children,
  navbar,
}: {
  children: React.ReactNode;
  navbar: React.ReactNode;
}) {
  const pathname = usePathname();

  // Routes that should not show the navbar
  const noNavRoutes = ['/login', '/register', '/forgot-password', '/onboarding'];

  return (
    <>
      {!noNavRoutes.includes(pathname) && navbar}
      <m.main
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.3,
          ease: [0.25, 0.1, 0.25, 1] // Custom easing for smoother feel
        }}
        className="min-h-screen"
      >
        {children}
      </m.main>
    </>
  );
}
