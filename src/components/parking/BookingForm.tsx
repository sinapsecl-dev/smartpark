'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Tables } from '@/types/supabase';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBooking, updateBooking } from '@/app/lib/booking-actions';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Clock, Car, CheckCircle2, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================
// UTILITIES
// ============================================================

/**
 * Quantizes a Date object to the nearest 15-minute interval (floored).
 * E.g., 09:52 -> 09:45
 */
const getQuantizedTime = (date: Date): Date => {
  const result = new Date(date);
  const minutes = result.getMinutes();
  const quantizedMinutes = Math.floor(minutes / 15) * 15;
  result.setMinutes(quantizedMinutes, 0, 0);
  return result;
};

/**
 * Formats a Date to HH:mm string.
 */
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
};

/**
 * Generates an array of time slots in 15-minute intervals.
 * @param startFrom - The Date from which to start generating slots.
 * @param count - Number of slots to generate.
 */
const generateTimeSlots = (startFrom: Date, count: number): Date[] => {
  const slots: Date[] = [];
  for (let i = 0; i < count; i++) {
    const slotTime = new Date(startFrom.getTime() + i * 15 * 60 * 1000);
    slots.push(slotTime);
  }
  return slots;
};

// ============================================================
// CONSTANTS
// ============================================================

const MAX_BOOKING_DURATION_HOURS = 4;
const MAX_BOOKING_DURATION_MINUTES = MAX_BOOKING_DURATION_HOURS * 60;
const INTERVAL_MINUTES = 15;

// ============================================================
// SCHEMA
// ============================================================

const bookingSchema = z.object({
  license_plate: z.string().min(1, 'La patente es obligatoria.').max(10, 'Patente inválida.'),
  start_time: z.string().min(1, 'La hora de inicio es obligatoria.'),
  end_time: z.string().min(1, 'La hora de fin es obligatoria.'),
  spot_id: z.string().min(1, 'El ID del spot es obligatorio.'),
});

type BookingFormInputs = z.infer<typeof bookingSchema>;

// ============================================================
// COMPONENT PROPS
// ============================================================

type BookingWithUnit = Tables<'bookings'> & { units?: { name: string | null } | null };

interface BookingFormProps {
  spot: Tables<'spots'>;
  onClose: () => void;
  existingBooking?: BookingWithUnit | null;
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface TimeSlotButtonProps {
  time: Date;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const TimeSlotButton: React.FC<TimeSlotButtonProps> = ({ time, isSelected, onClick, disabled }) => (
  <motion.button
    type="button"
    whileHover={{ scale: disabled ? 1 : 1.03 }}
    whileTap={{ scale: disabled ? 1 : 0.97 }}
    onClick={onClick}
    disabled={disabled}
    className={clsx(
      'py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-primary/50',
      isSelected
        ? 'bg-primary text-white shadow-md'
        : 'border border-[#d1dce2] dark:border-[#354855] text-[#49829c] dark:text-[#a0bfce] hover:bg-gray-50 dark:hover:bg-[#1e2a32]',
      disabled && 'opacity-50 cursor-not-allowed'
    )}
  >
    {formatTime(time)}
  </motion.button>
);

interface BookingSummaryProps {
  spotName: string;
  licensePlate: string;
  startTime: Date;
  endTime: Date;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({ spotName, licensePlate, startTime, endTime }) => {
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationString = hours > 0
    ? `${hours}h ${minutes > 0 ? `${minutes}min` : ''}`
    : `${minutes} min`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#f0f9ff] dark:bg-primary/10 rounded-xl p-5 border border-primary/20 space-y-4"
    >
      <div className="flex items-center gap-2 text-primary">
        <CheckCircle2 className="w-5 h-5" />
        <h3 className="font-semibold text-base">Resumen de Reserva</h3>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[#49829c] dark:text-[#a0bfce] text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">local_parking</span>
            Estacionamiento
          </span>
          <span className="font-bold text-[#0d171c] dark:text-white">{spotName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#49829c] dark:text-[#a0bfce] text-sm flex items-center gap-2">
            <Car className="w-4 h-4" />
            Patente
          </span>
          <span className="font-bold text-[#0d171c] dark:text-white font-mono tracking-wider uppercase">{licensePlate}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#49829c] dark:text-[#a0bfce] text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Horario
          </span>
          <span className="font-bold text-[#0d171c] dark:text-white">
            {formatTime(startTime)} - {formatTime(endTime)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-primary/10">
          <span className="text-[#49829c] dark:text-[#a0bfce] text-sm">Duración total</span>
          <span className="font-bold text-primary text-lg">{durationString}</span>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

type FormStep = 'details' | 'confirmation';

const BookingForm: React.FC<BookingFormProps> = ({ spot, onClose, existingBooking }) => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<FormStep>('details');
  const isEditMode = !!existingBooking;

  // Get the current quantized time as the starting point
  const now = useMemo(() => getQuantizedTime(new Date()), []);

  // For edit mode, use existing booking times as starting point
  const initialStartTime = useMemo(() => {
    if (existingBooking) {
      return getQuantizedTime(new Date(existingBooking.start_time));
    }
    return now;
  }, [existingBooking, now]);

  // Generate start time options (from now to +4 hours in 15-min intervals)
  const startTimeOptions = useMemo(() => {
    const slotCount = (MAX_BOOKING_DURATION_HOURS * 60) / INTERVAL_MINUTES;
    return generateTimeSlots(now, slotCount);
  }, [now]);

  const [selectedStartTime, setSelectedStartTime] = useState<Date>(initialStartTime);
  const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(
    existingBooking ? new Date(existingBooking.end_time) : null
  );

  // Generate end time options based on selected start time
  const endTimeOptions = useMemo(() => {
    if (!selectedStartTime) return [];

    const slots: Date[] = [];
    const maxSlots = MAX_BOOKING_DURATION_MINUTES / INTERVAL_MINUTES;

    for (let i = 1; i <= maxSlots; i++) {
      const slotTime = new Date(selectedStartTime.getTime() + i * INTERVAL_MINUTES * 60 * 1000);
      slots.push(slotTime);
    }
    return slots;
  }, [selectedStartTime]);

  // Calculate duration
  const durationMinutes = useMemo(() => {
    if (!selectedStartTime || !selectedEndTime) return 0;
    return (selectedEndTime.getTime() - selectedStartTime.getTime()) / (1000 * 60);
  }, [selectedStartTime, selectedEndTime]);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormInputs>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      spot_id: spot.id,
      start_time: initialStartTime.toISOString(),
      end_time: existingBooking?.end_time || '',
      license_plate: existingBooking?.license_plate || '',
    },
  });

  const licensePlateWatch = watch('license_plate');

  // Update form values when times change
  const handleStartTimeChange = useCallback((time: Date) => {
    setSelectedStartTime(time);
    setValue('start_time', time.toISOString());
    // Reset end time when start time changes
    setSelectedEndTime(null);
    setValue('end_time', '');
  }, [setValue]);

  const handleEndTimeChange = useCallback((time: Date) => {
    setSelectedEndTime(time);
    setValue('end_time', time.toISOString());
  }, [setValue]);

  // Validate and proceed to confirmation
  const handleProceedToConfirmation = async () => {
    const isValid = await trigger(['license_plate', 'start_time', 'end_time']);
    if (isValid && selectedEndTime) {
      setCurrentStep('confirmation');
    }
  };

  // Go back to details
  const handleBackToDetails = () => {
    setCurrentStep('details');
  };

  // Submit form
  const onSubmit = async (data: BookingFormInputs) => {
    const formData = new FormData();
    formData.append('license_plate', data.license_plate);
    formData.append('start_time', data.start_time);
    formData.append('end_time', data.end_time);
    formData.append('spot_id', data.spot_id);

    let result;

    if (isEditMode && existingBooking) {
      // Edit existing booking
      result = await updateBooking(existingBooking.id, formData);
    } else {
      // Create new booking
      result = await createBooking(formData);
    }

    if (result.success) {
      // Simply close the modal - Realtime subscription will update the grid automatically
      onClose();
    } else {
      setError('root.serverError', { type: 'manual', message: result.message });
      setCurrentStep('details'); // Go back if there's an error
    }
  };

  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  const direction = currentStep === 'confirmation' ? 1 : -1;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="overflow-hidden">
      <AnimatePresence mode="wait" custom={direction}>
        {currentStep === 'details' && (
          <motion.div
            key="details"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex flex-col gap-6"
          >
            {/* License Plate Input */}
            <div className="flex flex-col gap-2">
              <label htmlFor="license_plate" className="text-sm font-semibold text-[#0d171c] dark:text-white">
                Patente del Vehículo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#49829c]">
                  <Car className="w-5 h-5" />
                </div>
                <input
                  id="license_plate"
                  type="text"
                  {...register('license_plate')}
                  className={clsx(
                    'w-full pl-10 pr-4 py-3 rounded-lg border bg-white dark:bg-[#101c22] text-[#0d171c] dark:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                    'uppercase font-mono tracking-wider text-lg transition-all',
                    errors.license_plate ? 'border-red-500' : 'border-[#d1dce2] dark:border-[#354855]'
                  )}
                  placeholder="AB-CD-12"
                  maxLength={10}
                />
              </div>
              {errors.license_plate && (
                <p className="text-sm text-red-500">{errors.license_plate.message}</p>
              )}
            </div>

            {/* Start Time Selection */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-[#0d171c] dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Hora de Inicio
              </label>
              <div className="grid grid-cols-4 gap-2 max-h-[120px] overflow-y-auto p-1">
                {startTimeOptions.map((time, idx) => (
                  <TimeSlotButton
                    key={idx}
                    time={time}
                    isSelected={selectedStartTime?.getTime() === time.getTime()}
                    onClick={() => handleStartTimeChange(time)}
                  />
                ))}
              </div>
            </div>

            {/* End Time Selection */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-[#0d171c] dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Hora de Fin
                {durationMinutes > 0 && (
                  <span className="ml-auto bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                    {durationMinutes >= 60
                      ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60 > 0 ? `${durationMinutes % 60}min` : ''}`
                      : `${durationMinutes} min`}
                  </span>
                )}
              </label>
              <div className="grid grid-cols-4 gap-2 max-h-[120px] overflow-y-auto p-1">
                {endTimeOptions.map((time, idx) => (
                  <TimeSlotButton
                    key={idx}
                    time={time}
                    isSelected={selectedEndTime?.getTime() === time.getTime()}
                    onClick={() => handleEndTimeChange(time)}
                  />
                ))}
              </div>
              {!selectedEndTime && endTimeOptions.length > 0 && (
                <p className="text-xs text-[#49829c] dark:text-[#a0bfce] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  Selecciona una hora de fin (máximo {MAX_BOOKING_DURATION_HOURS} horas)
                </p>
              )}
            </div>

            {/* Hidden inputs */}
            <input type="hidden" {...register('start_time')} />
            <input type="hidden" {...register('end_time')} />
            <input type="hidden" {...register('spot_id')} />

            {/* Errors */}
            {errors.root?.serverError && (
              <p className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {errors.root.serverError.message}
              </p>
            )}

            {/* Continue Button */}
            <Button
              type="button"
              onClick={handleProceedToConfirmation}
              disabled={!licensePlateWatch || !selectedEndTime}
              className="w-full h-12 text-base font-bold"
            >
              Continuar
            </Button>
          </motion.div>
        )}

        {currentStep === 'confirmation' && (
          <motion.div
            key="confirmation"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex flex-col gap-6"
          >
            {/* Back Button */}
            <button
              type="button"
              onClick={handleBackToDetails}
              className="flex items-center gap-2 text-[#49829c] dark:text-[#a0bfce] hover:text-primary transition-colors self-start"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Modificar datos</span>
            </button>

            {/* Summary */}
            {selectedEndTime && (
              <BookingSummary
                spotName={spot.name || 'Sin nombre'}
                licensePlate={licensePlateWatch}
                startTime={selectedStartTime}
                endTime={selectedEndTime}
              />
            )}

            {/* Errors */}
            {errors.root?.serverError && (
              <p className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {errors.root.serverError.message}
              </p>
            )}

            {/* Confirm Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 text-base font-bold shadow-lg shadow-primary/30 gap-2"
            >
              {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
              {isEditMode ? (
                <>
                  <Edit3 className="w-4 h-4" />
                  Actualizar Reserva
                </>
              ) : (
                'Confirmar Reserva'
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
};

export default BookingForm;
