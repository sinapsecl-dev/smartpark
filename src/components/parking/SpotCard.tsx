'use client';

import React from 'react';
import { Tables } from '@/types/supabase';
import clsx from 'clsx';
import { motion } from 'framer-motion';

const staggerItem = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.3 } },
};

type Spot = Tables<'spots'>;
type Booking = Tables<'bookings'>;

type BookingWithUnit = Booking & { units?: { name: string | null } | null };

interface SpotCardProps {
  spot: Spot;
  currentBooking?: BookingWithUnit | null;
  futureBookings?: BookingWithUnit[];
  onSpotClick: (spot: Spot, booking?: BookingWithUnit | null) => void;
  userUnitId: string;
}

const SpotCard: React.FC<SpotCardProps> = ({
  spot,
  currentBooking,
  futureBookings = [],
  onSpotClick,
  userUnitId,
}) => {
  let status: 'free' | 'occupied' | 'reserved' | 'urgent' | 'mine' = 'free';
  let icon = 'check_circle';
  let iconColorClass = 'text-emerald-600 dark:text-emerald-400';
  let bgColorClass = 'bg-emerald-100';
  let borderColorClass = 'border-emerald-200 dark:border-emerald-900/50';
  let mainBgClass = 'bg-[#f0fdf4] dark:bg-emerald-900/20';
  let mainTextColorClass = 'text-emerald-600 dark:text-emerald-400';
  let statusText = 'Disponible';

  const now = new Date();

  // Check if user has a booking for this spot (current or future)
  const isUserCurrentBooking = currentBooking?.unit_id === userUnitId;
  const userFutureBooking = futureBookings.find(b => b.unit_id === userUnitId);
  const isUserBooking = isUserCurrentBooking || !!userFutureBooking;

  if (currentBooking) {
    const endTime = new Date(currentBooking.end_time);
    const timeUntilEnd = endTime.getTime() - now.getTime();
    const oneHour = 60 * 60 * 1000;

    if (isUserCurrentBooking) {
      // User's own active booking
      status = 'mine';
      icon = 'person';
      iconColorClass = 'text-primary';
      bgColorClass = 'bg-primary/20';
      borderColorClass = 'border-primary/50';
      mainBgClass = 'bg-primary/5 dark:bg-primary/10';
      mainTextColorClass = 'text-primary';
      statusText = 'Tu Reserva';
    } else if (timeUntilEnd < oneHour) {
      status = 'urgent';
      icon = 'warning';
      iconColorClass = 'text-orange-600 dark:text-orange-400';
      bgColorClass = 'bg-orange-100';
      borderColorClass = 'border-orange-200 dark:border-orange-900/50';
      mainBgClass = 'bg-orange-50 dark:bg-orange-900/20';
      mainTextColorClass = 'text-orange-600 dark:text-orange-400';
      statusText = timeUntilEnd < 0 ? 'Excedido' : 'Pronto a Vencer';
    } else {
      status = 'occupied';
      icon = 'block';
      iconColorClass = 'text-red-600 dark:text-red-400';
      bgColorClass = 'bg-red-100';
      borderColorClass = 'border-red-200 dark:border-red-900/50';
      mainBgClass = 'bg-red-50 dark:bg-red-900/20';
      mainTextColorClass = 'text-red-600 dark:text-red-400';
      statusText = 'Ocupado';
    }
  } else if (futureBookings.length > 0) {
    if (userFutureBooking) {
      // User's future booking (not yet started)
      status = 'mine';
      icon = 'schedule';
      iconColorClass = 'text-primary';
      bgColorClass = 'bg-primary/20';
      borderColorClass = 'border-primary/50';
      mainBgClass = 'bg-primary/5 dark:bg-primary/10';
      mainTextColorClass = 'text-primary';
      statusText = 'Reservado por ti';
    } else {
      status = 'reserved';
      icon = 'schedule';
      iconColorClass = 'text-amber-600 dark:text-amber-400';
      bgColorClass = 'bg-amber-100';
      borderColorClass = 'border-amber-200 dark:border-amber-900/50';
      mainBgClass = 'bg-amber-50 dark:bg-amber-900/20';
      mainTextColorClass = 'text-amber-600 dark:text-amber-400';
      statusText = 'Reservado';
    }
  }

  // Format time display
  const getTimeInfo = () => {
    if (isUserCurrentBooking && currentBooking) {
      return new Date(currentBooking.end_time).toLocaleTimeString('es-CL', {
        hour: '2-digit', minute: '2-digit'
      });
    }
    if (userFutureBooking) {
      return new Date(userFutureBooking.start_time).toLocaleTimeString('es-CL', {
        hour: '2-digit', minute: '2-digit'
      });
    }
    if (currentBooking) {
      return new Date(currentBooking.end_time).toLocaleTimeString('es-CL', {
        hour: '2-digit', minute: '2-digit'
      });
    }
    return null;
  };

  const timeInfo = getTimeInfo();

  return (
    <motion.div
      variants={staggerItem}
      className={clsx(
        'group relative flex flex-col rounded-xl overflow-hidden shadow-sm',
        'transition-all duration-300 bg-white dark:bg-[#1e2a32] border',
        borderColorClass,
        'cursor-pointer hover:shadow-lg hover:-translate-y-1 touch-manipulation',
        isUserBooking && 'ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-[#101c22]'
      )}
      onClick={() => onSpotClick(spot, currentBooking)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Status Icon Badge */}
      <div className="absolute top-2 right-2 z-10">
        <span className={clsx(
          "flex h-6 w-6 items-center justify-center rounded-full",
          bgColorClass,
          iconColorClass
        )}>
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </span>
      </div>

      {/* User's Booking Badge */}
      {isUserBooking && (
        <div className="absolute top-2 left-2 z-10">
          <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wide shadow-sm">
            Tuya
          </span>
        </div>
      )}

      {/* Parking Visual */}
      <div className={clsx(
        "aspect-[4/3] w-full flex items-center justify-center relative overflow-hidden",
        mainBgClass
      )}>
        {status === 'free' && (
          <div className="w-1/2 h-2/3 border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-lg flex items-center justify-center">
            <span className={clsx("font-bold text-xs opacity-50", mainTextColorClass)}>LIBRE</span>
          </div>
        )}
        {(status === 'occupied' || status === 'urgent') && (
          <div className="w-1/2 h-2/3 bg-red-200 dark:bg-red-800 rounded-lg shadow-sm flex items-center justify-center">
            <span className={clsx("material-symbols-outlined", mainTextColorClass)}>directions_car</span>
          </div>
        )}
        {status === 'reserved' && (
          <div className="w-1/2 h-2/3 border-2 border-amber-300 dark:border-amber-700 bg-amber-100/50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
            <span className={clsx("font-bold text-xs", mainTextColorClass)}>RSRV</span>
          </div>
        )}
        {status === 'mine' && (
          <div className="w-1/2 h-2/3 bg-primary/20 dark:bg-primary/30 border-2 border-primary/50 rounded-lg shadow-sm flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">directions_car</span>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className={clsx(
        "p-3 sm:p-4 border-t",
        borderColorClass.replace('border-', 'border-t-'),
        "bg-white dark:bg-[#1e2a32]"
      )}>
        <h3 className="text-[#0d171c] dark:text-white text-base sm:text-lg font-bold">{spot.name}</h3>
        <div className="flex items-center justify-between mt-1 gap-2">
          <p className={clsx("text-[10px] sm:text-xs font-semibold uppercase", mainTextColorClass)}>
            {statusText}
          </p>
          {timeInfo && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5 flex-shrink-0">
              <span className="material-symbols-outlined text-[12px]">schedule</span>
              {timeInfo}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SpotCard;
