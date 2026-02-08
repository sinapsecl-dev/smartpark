'use client';

import React, { useState, useMemo } from 'react';
import { Tables } from '@/types/supabase';
import { deleteBooking } from '@/app/lib/booking-actions';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import { m, AnimatePresence } from 'framer-motion';
import {
  Clock, Car, Home, Calendar, Trash2, Edit3, AlertTriangle,
  CheckCircle2, Timer, ChevronRight, X, Loader2
} from 'lucide-react';
import ReportProblemDialog from './ReportProblemDialog';

type Spot = Tables<'spots'>;
type Booking = Tables<'bookings'>;

type BookingWithUnit = Booking & { units?: { name: string | null } | null };

interface SpotDetailsProps {
  spot: Spot | null;
  booking: BookingWithUnit | null;
  futureBookings: BookingWithUnit[];
  unitName?: string;
  userUnitId: string;
  onClose?: () => void;
  onEditBooking?: (booking: BookingWithUnit) => void;
  onNewBooking?: () => void;
}

// Status configuration
const statusConfig = {
  confirmed: { label: 'Confirmado', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: CheckCircle2 },
  active: { label: 'Activo', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle2 },
  completed: { label: 'Completado', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', icon: X },
  reported: { label: 'Reportado', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: AlertTriangle },
  liberated: { label: 'Liberado', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800', icon: CheckCircle2 },
};

// Duration calculation
const formatDuration = (startTime: Date, endTime: Date): string => {
  const durationMs = endTime.getTime() - startTime.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes > 0 ? `${minutes}min` : ''}`;
  }
  return `${minutes} min`;
};

// Time remaining calculation
const getTimeRemaining = (endTime: Date): { text: string; percentage: number; isUrgent: boolean } => {
  const now = new Date();
  const remaining = endTime.getTime() - now.getTime();
  const totalDuration = 4 * 60 * 60 * 1000; // Assume max 4 hours
  const percentage = Math.max(0, Math.min(100, (remaining / totalDuration) * 100));

  if (remaining <= 0) {
    return { text: 'Tiempo excedido', percentage: 0, isUrgent: true };
  }

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  const isUrgent = remaining < 60 * 60 * 1000; // Less than 1 hour

  if (hours > 0) {
    return { text: `${hours}h ${minutes}min restantes`, percentage, isUrgent };
  }
  return { text: `${minutes} min restantes`, percentage, isUrgent };
};

// Quantize time to 15 min intervals (floor)
const getQuantizedTime = (date: Date): Date => {
  const result = new Date(date);
  const minutes = result.getMinutes();
  const quantizedMinutes = Math.floor(minutes / 15) * 15;
  result.setMinutes(quantizedMinutes, 0, 0);
  return result;
};

// Calculate availability for new reservations
const calculateAvailability = (
  currentBooking: BookingWithUnit | null,
  futureBookings: BookingWithUnit[]
): { canReserve: boolean; availableMinutes: number; maxEndTime: Date | null; message: string } => {
  const now = getQuantizedTime(new Date());
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  let availableFrom = now;

  // If there's a current booking, availability starts after it ends
  if (currentBooking) {
    const bookingEnd = new Date(currentBooking.end_time);
    if (bookingEnd > now) {
      availableFrom = getQuantizedTime(bookingEnd);
      // Round up to next 15 min interval if not exact
      if (bookingEnd.getTime() > availableFrom.getTime()) {
        availableFrom = new Date(availableFrom.getTime() + 15 * 60 * 1000);
      }
    }
  }

  // Find the next booking after availableFrom
  const nextBooking = futureBookings.find(b => new Date(b.start_time) > availableFrom);
  const maxEndTime = nextBooking ? new Date(nextBooking.start_time) : endOfDay;

  const availableMinutes = (maxEndTime.getTime() - availableFrom.getTime()) / (1000 * 60);

  if (availableMinutes < 15) {
    return {
      canReserve: false,
      availableMinutes: 0,
      maxEndTime: null,
      message: 'Completamente reservado por hoy'
    };
  }

  return {
    canReserve: true,
    availableMinutes,
    maxEndTime,
    message: ''
  };
};

// Info Row component
const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string; highlight?: boolean }> = ({
  icon, label, value, highlight
}) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
    <div className="flex items-center gap-2 text-[#49829c] dark:text-gray-400">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
    <span className={clsx(
      "font-semibold text-sm",
      highlight ? "text-primary" : "text-[#0d171c] dark:text-white"
    )}>
      {value}
    </span>
  </div>
);

// Future Booking Item
const FutureBookingItem: React.FC<{
  booking: BookingWithUnit;
  isOwn: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({ booking, isOwn, onEdit, onDelete }) => {
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);

  return (
    <m.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={clsx(
        "flex items-center justify-between p-3 rounded-lg transition-all",
        isOwn
          ? "bg-primary/5 border border-primary/20"
          : "bg-gray-50 dark:bg-gray-800/50"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={clsx(
          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
          isOwn ? "bg-primary/10" : "bg-gray-200 dark:bg-gray-700"
        )}>
          <Clock className={clsx("w-5 h-5", isOwn ? "text-primary" : "text-gray-500")} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[#0d171c] dark:text-white">
              {startTime.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isOwn && (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary text-white">
                Tuya
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {booking.units?.name || 'Unidad desconocida'} • {booking.license_plate}
          </span>
        </div>
      </div>
      {isOwn && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors touch-manipulation"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors touch-manipulation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </m.div>
  );
};

const SpotDetails: React.FC<SpotDetailsProps> = ({
  spot,
  booking,
  futureBookings,
  unitName,
  userUnitId,
  onClose,
  onEditBooking,
  onNewBooking
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  if (!spot) return null;

  const isUserBooking = booking?.unit_id === userUnitId;
  const hasActiveBooking = booking && new Date(booking.start_time) <= new Date();
  const canModifyBooking = isUserBooking && !hasActiveBooking;

  const timeRemaining = booking ? getTimeRemaining(new Date(booking.end_time)) : null;
  const statusInfo = booking?.status ? statusConfig[booking.status as keyof typeof statusConfig] : null;

  const handleDeleteBooking = async (bookingId: string) => {
    setIsDeleting(true);
    setDeleteError(null);

    const result = await deleteBooking(bookingId);

    if (!result.success) {
      setDeleteError(result.message);
      setIsDeleting(false);
      return;
    }

    setShowDeleteConfirm(null);
    setIsDeleting(false);
    onClose?.();
  };

  // Get user's future bookings for this spot
  const userFutureBookings = futureBookings.filter(b => b.unit_id === userUnitId);
  const otherFutureBookings = futureBookings.filter(b => b.unit_id !== userUnitId);

  // Calculate availability for new reservations
  const availability = useMemo(() =>
    calculateAvailability(booking, futureBookings),
    [booking, futureBookings]
  );

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <m.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#1a262d] rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#0d171c] dark:text-white">¿Cancelar Reserva?</h3>
                  <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
                </div>
              </div>

              {deleteError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 h-12"
                  disabled={isDeleting}
                >
                  Mantener
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteBooking(showDeleteConfirm)}
                  className="flex-1 h-12"
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancelar Reserva'}
                </Button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Current Booking Section */}
      {booking ? (
        <div className="flex flex-col gap-4">
          {/* Status Badge & User Badge */}
          <div className="flex items-center justify-between">
            {statusInfo && (
              <div className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-full",
                statusInfo.bg
              )}>
                <statusInfo.icon className={clsx("w-4 h-4", statusInfo.color)} />
                <span className={clsx("text-sm font-semibold", statusInfo.color)}>
                  {statusInfo.label}
                </span>
              </div>
            )}
            {isUserBooking && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-sm font-bold text-primary">Tu Reserva</span>
              </div>
            )}
          </div>

          {/* Time Remaining Progress (only for active bookings) */}
          {hasActiveBooking && timeRemaining && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Timer className={clsx(
                    "w-4 h-4",
                    timeRemaining.isUrgent ? "text-amber-500" : "text-primary"
                  )} />
                  <span className="text-sm font-medium text-[#0d171c] dark:text-white">
                    Tiempo Restante
                  </span>
                </div>
                <span className={clsx(
                  "text-sm font-bold",
                  timeRemaining.isUrgent ? "text-amber-500" : "text-primary"
                )}>
                  {timeRemaining.text}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <m.div
                  initial={{ width: 0 }}
                  animate={{ width: `${timeRemaining.percentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={clsx(
                    "h-full rounded-full",
                    timeRemaining.isUrgent ? "bg-amber-500" : "bg-primary"
                  )}
                />
              </div>
            </div>
          )}

          {/* Booking Details Card */}
          <div className="bg-white dark:bg-[#1e2a32] rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 sm:p-5">
              <InfoRow
                icon={<Home className="w-4 h-4" />}
                label="Unidad"
                value={unitName || booking.units?.name || 'N/A'}
              />
              <InfoRow
                icon={<Car className="w-4 h-4" />}
                label="Patente"
                value={booking.license_plate || 'N/A'}
                highlight
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Inicio"
                value={new Date(booking.start_time).toLocaleString('es-CL', {
                  dateStyle: 'short',
                  timeStyle: 'short'
                })}
              />
              <InfoRow
                icon={<Clock className="w-4 h-4" />}
                label="Fin"
                value={new Date(booking.end_time).toLocaleString('es-CL', {
                  dateStyle: 'short',
                  timeStyle: 'short'
                })}
              />
              <InfoRow
                icon={<Timer className="w-4 h-4" />}
                label="Duración"
                value={formatDuration(new Date(booking.start_time), new Date(booking.end_time))}
                highlight
              />
            </div>

            {/* Action Buttons for User's Own Reserved (not active) Booking */}
            {canModifyBooking && (
              <div className="border-t border-gray-100 dark:border-gray-700 p-4 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => onEditBooking?.(booking)}
                  className="flex-1 h-11 gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(booking.id)}
                  className="flex-1 h-11 gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Available Spot */
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-[#0d171c] dark:text-white mb-1">
            Espacio Disponible
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Este estacionamiento está libre para reservar
          </p>
          <Button
            onClick={onNewBooking}
            className="w-full sm:w-auto h-12 px-8 gap-2 text-base font-semibold"
          >
            <Calendar className="w-5 h-5" />
            Nueva Reserva
          </Button>
        </div>
      )}

      {/* Future Bookings Section */}
      {futureBookings.length > 0 && (
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-bold text-[#0d171c] dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Próximas Reservas ({futureBookings.length})
          </h4>
          <div className="flex flex-col gap-2">
            {/* User's bookings first */}
            {userFutureBookings.map((fb) => (
              <FutureBookingItem
                key={fb.id}
                booking={fb}
                isOwn={true}
                onEdit={() => onEditBooking?.(fb)}
                onDelete={() => setShowDeleteConfirm(fb.id)}
              />
            ))}
            {/* Then others */}
            {otherFutureBookings.map((fb) => (
              <FutureBookingItem
                key={fb.id}
                booking={fb}
                isOwn={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Report Issue Button (Always visible) */}
      {(!!booking || !booking) && (
        <Button
          variant="outline"
          onClick={() => setIsReportDialogOpen(true)}
          className="w-full h-11 gap-2 text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20"
        >
          <AlertTriangle className="w-4 h-4" />
          {booking ? 'Reportar Problema' : 'Reportar Uso Indebido'}
        </Button>
      )}

      {/* Conditional New Reservation Button */}
      {availability.canReserve ? (
        <Button
          onClick={onNewBooking}
          className="w-full h-12 gap-2 text-base font-semibold"
        >
          <Calendar className="w-5 h-5" />
          Nueva Reserva
        </Button>
      ) : (booking || futureBookings.length > 0) && (
        <div className="text-center py-3 px-4 rounded-lg bg-gray-100 dark:bg-gray-800/50">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            {availability.message}
          </p>
        </div>
      )}

      {/* Report Problem Dialog */}
      <ReportProblemDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        spotName={`Estacionamiento ${spot.name}`}
        isFreeSpot={!booking}
        bookingId={booking?.id}
        isUserBooking={isUserBooking}
      />
    </div>
  );
};

export default SpotDetails;
