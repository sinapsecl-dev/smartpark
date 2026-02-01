'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Tables } from '@/types/supabase';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBooking, updateBooking } from '@/app/lib/booking-actions';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, Clock, Car, CheckCircle2, Edit3, AlertCircle } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { triggerBookingConfetti } from '@/components/BookingConfetti';
import { showXPToast } from '@/components/gamification/XPGainToast';

// ============================================================
// UTILITIES
// ============================================================

/**
 * Quantizes a Date object to the nearest 15-minute interval (floored).
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
const INTERVAL_MINUTES = 15;

// Duration options in minutes
const DURATION_OPTIONS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hora', minutes: 60 },
  { label: '1h 30m', minutes: 90 },
  { label: '2 horas', minutes: 120 },
  { label: '3 horas', minutes: 180 },
  { label: '4 horas', minutes: 240 },
];

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
  futureBookings?: BookingWithUnit[];
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface TimeCarouselProps {
  times: Date[];
  selectedTime: Date;
  onSelect: (time: Date) => void;
}

const TimeCarousel: React.FC<TimeCarouselProps> = ({ times, selectedTime, onSelect }) => {
  const selectedIndex = times.findIndex(t => t.getTime() === selectedTime.getTime());

  // Show only 3 visible slots centered on selection
  const visibleTimes = times.slice(
    Math.max(0, selectedIndex - 1),
    Math.min(times.length, selectedIndex + 2)
  );

  const scroll = (direction: 'left' | 'right') => {
    const newIndex = direction === 'left'
      ? Math.max(0, selectedIndex - 1)
      : Math.min(times.length - 1, selectedIndex + 1);
    onSelect(times[newIndex]);
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <button
        type="button"
        onClick={() => scroll('left')}
        disabled={selectedIndex <= 0}
        className={clsx(
          "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all",
          "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
          selectedIndex <= 0 && "opacity-30 cursor-not-allowed"
        )}
      >
        <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>

      <div className="flex-1 flex justify-center gap-2 overflow-hidden">
        {visibleTimes.map((time) => {
          const isSelected = time.getTime() === selectedTime.getTime();
          return (
            <m.button
              key={time.toISOString()}
              type="button"
              onClick={() => onSelect(time)}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={clsx(
                "px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0",
                isSelected
                  ? "bg-primary text-white shadow-md scale-105"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {formatTime(time)}
            </m.button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scroll('right')}
        disabled={selectedIndex >= times.length - 1}
        className={clsx(
          "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all",
          "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
          selectedIndex >= times.length - 1 && "opacity-30 cursor-not-allowed"
        )}
      >
        <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
    </div>
  );
};

interface DurationPillsProps {
  options: typeof DURATION_OPTIONS;
  selectedDuration: number | null;
  onSelect: (minutes: number) => void;
  maxDuration?: number; // Max allowed duration in minutes
}

const DurationPills: React.FC<DurationPillsProps> = ({ options, selectedDuration, onSelect, maxDuration }) => {
  return (
    <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:gap-2">
      {options.map((opt) => {
        const isDisabled = maxDuration !== undefined && opt.minutes > maxDuration;
        const isSelected = selectedDuration === opt.minutes;

        return (
          <m.button
            key={opt.minutes}
            type="button"
            onClick={() => !isDisabled && onSelect(opt.minutes)}
            disabled={isDisabled}
            whileHover={{ scale: isDisabled ? 1 : 1.05 }}
            whileTap={{ scale: isDisabled ? 1 : 0.95 }}
            className={clsx(
              "px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all",
              isSelected
                ? "bg-primary text-white shadow-md"
                : isDisabled
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            {opt.label}
          </m.button>
        );
      })}
    </div>
  );
};

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
    <m.div
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
    </m.div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

type FormStep = 'details' | 'confirmation';

const BookingForm: React.FC<BookingFormProps> = ({ spot, onClose, existingBooking, futureBookings = [] }) => {
  const [currentStep, setCurrentStep] = useState<FormStep>('details');
  const isEditMode = !!existingBooking;

  // Get the current quantized time as the starting point
  const now = useMemo(() => getQuantizedTime(new Date()), []);

  // Calculate max end time based on next reservation
  const maxEndTime = useMemo(() => {
    if (!futureBookings.length) return null;
    // Find the earliest future booking that starts after now
    const nextBooking = futureBookings.find(b => new Date(b.start_time) > now);
    return nextBooking ? new Date(nextBooking.start_time) : null;
  }, [futureBookings, now]);

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
    let slots = generateTimeSlots(now, slotCount);

    // Filter out start times that would leave less than 15 min before next booking
    if (maxEndTime) {
      slots = slots.filter(time =>
        (maxEndTime.getTime() - time.getTime()) >= 15 * 60 * 1000
      );
    }

    return slots;
  }, [now, maxEndTime]);

  const [selectedStartTime, setSelectedStartTime] = useState<Date>(
    startTimeOptions.includes(initialStartTime) ? initialStartTime : startTimeOptions[0]
  );
  const [selectedDuration, setSelectedDuration] = useState<number | null>(
    existingBooking
      ? (new Date(existingBooking.end_time).getTime() - new Date(existingBooking.start_time).getTime()) / (1000 * 60)
      : null
  );

  // Calculate max available duration based on selected start time and next booking
  const maxDuration = useMemo(() => {
    if (!maxEndTime) return MAX_BOOKING_DURATION_HOURS * 60;
    const available = (maxEndTime.getTime() - selectedStartTime.getTime()) / (1000 * 60);
    return Math.min(available, MAX_BOOKING_DURATION_HOURS * 60);
  }, [selectedStartTime, maxEndTime]);

  // Calculate end time based on start + duration
  const selectedEndTime = useMemo(() => {
    if (!selectedDuration) return null;
    return new Date(selectedStartTime.getTime() + selectedDuration * 60 * 1000);
  }, [selectedStartTime, selectedDuration]);

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
    // Reset duration if it would exceed max
    if (selectedDuration && maxEndTime) {
      const newMaxDuration = (maxEndTime.getTime() - time.getTime()) / (1000 * 60);
      if (selectedDuration > newMaxDuration) {
        setSelectedDuration(null);
        setValue('end_time', '');
      }
    }
  }, [setValue, selectedDuration, maxEndTime]);

  const handleDurationChange = useCallback((minutes: number) => {
    setSelectedDuration(minutes);
    const endTime = new Date(selectedStartTime.getTime() + minutes * 60 * 1000);
    setValue('end_time', endTime.toISOString());
  }, [selectedStartTime, setValue]);

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
      result = await updateBooking(existingBooking.id, formData);
    } else {
      result = await createBooking(formData);
    }

    if (result.success) {
      // Trigger celebration confetti and XP toast for new bookings
      if (!isEditMode) {
        triggerBookingConfetti();
        // Show XP gain toast with feedback
        const xpResult = result as { xpGained?: number; leveledUp?: boolean; newLevel?: number };
        if (xpResult.xpGained) {
          showXPToast(xpResult.xpGained, xpResult.leveledUp ?? false, xpResult.newLevel ?? 1);
        }
        // Emit custom event for gamification hook to listen
        window.dispatchEvent(new CustomEvent('booking:created'));
      }
      onClose();
    } else {
      setError('root.serverError', { type: 'manual', message: result.message });
      setCurrentStep('details');
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
          <m.div
            key="details"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex flex-col gap-6"
          >
            {/* License Plate Input - PROMINENT */}
            <div className="flex flex-col gap-3">
              <label htmlFor="license_plate" className="text-sm font-bold text-[#0d171c] dark:text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                Patente del Vehículo
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="license_plate"
                  type="text"
                  {...register('license_plate')}
                  className={clsx(
                    'w-full px-4 py-4 rounded-xl border-2 bg-white dark:bg-[#101c22] text-[#0d171c] dark:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                    'uppercase font-mono tracking-[0.3em] text-xl sm:text-2xl text-center transition-all',
                    errors.license_plate
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                  )}
                  placeholder="AB-CD-12"
                  maxLength={10}
                  autoFocus
                />
                {!licensePlateWatch && (
                  <p className="mt-2 text-xs text-center text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Ingresa la patente antes de seleccionar horario
                  </p>
                )}
              </div>
              {errors.license_plate && (
                <p className="text-sm text-red-500 text-center">{errors.license_plate.message}</p>
              )}
            </div>

            {/* Start Time Selection - Carousel */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-[#0d171c] dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Comenzar a las
              </label>
              <TimeCarousel
                times={startTimeOptions}
                selectedTime={selectedStartTime}
                onSelect={handleStartTimeChange}
              />
            </div>

            {/* Duration Selection - Pills */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[#0d171c] dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Reservar por
                </label>
                {selectedDuration && (
                  <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-bold">
                    hasta {selectedEndTime && formatTime(selectedEndTime)}
                  </span>
                )}
              </div>
              <DurationPills
                options={DURATION_OPTIONS}
                selectedDuration={selectedDuration}
                onSelect={handleDurationChange}
                maxDuration={maxDuration}
              />
              {maxEndTime && maxDuration < MAX_BOOKING_DURATION_HOURS * 60 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  Máximo hasta {formatTime(maxEndTime)} (siguiente reserva)
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
              disabled={!licensePlateWatch || !selectedDuration}
              className="w-full h-12 text-base font-bold"
            >
              Continuar
            </Button>
          </m.div>
        )}

        {currentStep === 'confirmation' && (
          <m.div
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
          </m.div>
        )}
      </AnimatePresence>
    </form>
  );
};

export default BookingForm;
