'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

export default function ConditionalLayout({
  children,
  navbar,
}: {
  children: React.ReactNode;
  navbar: React.ReactNode;
}) {
  const pathname = usePathname();
  const noNavRoutes = ['/login'];

  return (
    <>
      {!noNavRoutes.includes(pathname) && navbar}
      <motion.main
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        {children}
      </motion.main>
    </>
  );
}
