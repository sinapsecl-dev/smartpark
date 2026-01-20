'use client';

import React from 'react';
import { Enums } from '@/types/supabase';
import Link from 'next/link';

interface UserProfileProps {
  userRole: Enums<'user_role'> | null;
  userHouseNumber: string | null;
  userEmail: string | undefined;
}

const UserProfile: React.FC<UserProfileProps> = ({ userRole, userHouseNumber, userEmail }) => {
  if (userRole === 'admin') {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-gray-800 dark:text-gray-200">Admin</span>
          <span className="text-gray-500 dark:text-gray-400">|</span>
          <span className="text-gray-600 dark:text-gray-300">{userEmail}</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">person</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">home</span>
        <span className="font-semibold text-gray-800 dark:text-gray-200">{userHouseNumber}</span>
      </div>
    </div>
  );
};

export default UserProfile;
