'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Tables } from '@/types/supabase';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBooking, updateBooking, getAvailableSlots, TimeSlot } from '@/app/lib/booking-actions';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, Clock, Car, CheckCircle2, Edit3, AlertCircle, Calendar } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { triggerBookingConfetti } from '@/components/BookingConfetti';
import { showXPToast } from '@/components/gamification/XPGainToast';
import { BookingSuccessOverlay } from './BookingSuccessOverlay';
import TimeSlotPicker from './TimeSlotPicker';

// ============================================================
// UTILITIES
// ============================================================

const getQuantizedTime = (date: Date): Date => {
  const result = new Date(date);
  const minutes = result.getMinutes();
  const quantizedMinutes = Math.floor(minutes / 15) * 15;
  result.setMinutes(quantizedMinutes, 0, 0);
  return result;
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const generateTimeSlots = (startFrom: Date, endAt: Date): Date[] => {
  const slots: Date[] = [];
  let current = new Date(startFrom);
  while (current < endAt) {
    slots.push(new Date(current));
    current = new Date(current.getTime() + 15 * 60 * 1000);
  }
  return slots;
};

// ============================================================
// CONSTANTS
// ============================================================

const MAX_BOOKING_DURATION_HOURS = 4;

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

const getBookingSchema = (isAccessible: boolean) => z.object({
  license_plate: z.string().min(1, 'La patente es obligatoria.').max(10, 'Patente inválida.'),
  start_time: z.string().min(1, 'La hora de inicio es obligatoria.'),
  end_time: z.string().min(1, 'La hora de fin es obligatoria.'),
  spot_id: z.string().min(1, 'El ID del spot es obligatorio.'),
  disability_credential: z
    .custom<FileList>()
    .refine((files) => !isAccessible || (files && files.length === 1), 'Debe subir su credencial para este estacionamiento.')
    .refine((files) => !files || files.length === 0 || files[0].size <= 5 * 1024 * 1024, 'El archivo no debe superar los 5MB.')
    .optional(),
});

type BookingFormInputs = z.infer<ReturnType<typeof getBookingSchema>>;

// ============================================================
// COMPONENT PROPS
// ============================================================

type BookingWithUnit = Tables<'bookings'> & { units?: { name: string | null } | null };

interface BookingFormProps {
  spot: Tables<'spots'>;
  userUnitId: string;
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
  maxDuration?: number;
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
      className="bg-[#f0f9ff] dark:bg-primary/10 rounded-xl p-4 border border-primary/20"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {spotName.replace('Estacionamiento ', '')}
            </div>
            <span className="font-bold text-[#0d171c] dark:text-white font-mono tracking-wider uppercase">{licensePlate}</span>
          </div>
          <span className="text-white bg-primary px-2.5 py-1 rounded-md shadow-sm text-sm font-bold">
            {durationString}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#49829c] dark:text-[#a0bfce]">
          <Clock className="w-4 h-4" />
          <span>
            {formatTime(startTime)} - {formatTime(endTime)}
          </span>
        </div>
      </div>
    </m.div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const BookingForm: React.FC<BookingFormProps> = ({ spot, userUnitId, onClose, existingBooking, futureBookings = [] }) => {
  const isEditMode = !!existingBooking;

  // ========== STATE ==========
  const [successData, setSuccessData] = useState<{
    show: boolean;
    xpGained?: number;
    leveledUp?: boolean;
    newLevel?: number;
  }>({ show: false });

  // Slot-based selection state
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [allBookings, setAllBookings] = useState<BookingWithUnit[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [maxBookingAheadMinutes, setMaxBookingAheadMinutes] = useState<number>(60);

  // Time selection (within selected slot)
  const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  // ========== LOAD AVAILABLE SLOTS ==========
  useEffect(() => {
    const loadSlots = async () => {
      setIsLoadingSlots(true);
      const result = await getAvailableSlots(spot.id);
      if (result.success) {
        // Store max booking ahead limit
        setMaxBookingAheadMinutes(result.maxBookingAheadMinutes);

        // Convert ISO strings back to Dates (server actions serialize Dates)
        const slots = result.slots.map(s => ({
          start: new Date(s.start),
          end: new Date(s.end),
          durationMinutes: s.durationMinutes
        }));
        setAvailableSlots(slots);
        setAllBookings(result.bookings as BookingWithUnit[]);

        // Auto-select first slot if available
        if (slots.length > 0 && !isEditMode) {
          setSelectedSlot(slots[0]);
          setSelectedStartTime(slots[0].start);
          setSelectedDuration(15); // Default 15 min
        }
      }
      setIsLoadingSlots(false);
    };
    loadSlots();
  }, [spot.id, isEditMode]);

  // ========== EDIT MODE INITIALIZATION ==========
  useEffect(() => {
    if (existingBooking && isEditMode) {
      const start = new Date(existingBooking.start_time);
      const end = new Date(existingBooking.end_time);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);

      setSelectedStartTime(start);
      setSelectedDuration(duration);
      // Create a pseudo-slot for edit mode
      setSelectedSlot({
        start,
        end: new Date(end.getTime() + 4 * 60 * 60 * 1000), // Allow extension up to 4h
        durationMinutes: duration + 240
      });
    }
  }, [existingBooking, isEditMode]);

  // ========== COMPUTED VALUES ==========

  // Calculate max allowed start time based on config
  const maxAllowedStartTime = useMemo(() => {
    const now = new Date();
    return new Date(now.getTime() + maxBookingAheadMinutes * 60 * 1000);
  }, [maxBookingAheadMinutes]);

  // Generate start time options within selected slot (limited by max ahead time)
  const startTimeOptions = useMemo(() => {
    if (!selectedSlot) return [];
    const allTimes = generateTimeSlots(selectedSlot.start, selectedSlot.end);
    // Filter to only include times within the allowed window
    return allTimes.filter(time => time <= maxAllowedStartTime);
  }, [selectedSlot, maxAllowedStartTime]);

  // Format the max ahead limit for display
  const maxAheadLabel = useMemo(() => {
    if (maxBookingAheadMinutes >= 60) {
      const hours = Math.floor(maxBookingAheadMinutes / 60);
      const mins = maxBookingAheadMinutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${maxBookingAheadMinutes} min`;
  }, [maxBookingAheadMinutes]);

  // Max duration based on selected start time and slot end
  const maxDuration = useMemo(() => {
    if (!selectedSlot || !selectedStartTime) return MAX_BOOKING_DURATION_HOURS * 60;
    const available = (selectedSlot.end.getTime() - selectedStartTime.getTime()) / (1000 * 60);
    return Math.min(available, MAX_BOOKING_DURATION_HOURS * 60);
  }, [selectedSlot, selectedStartTime]);

  // End time
  const selectedEndTime = useMemo(() => {
    if (!selectedStartTime || !selectedDuration) return null;
    return new Date(selectedStartTime.getTime() + selectedDuration * 60 * 1000);
  }, [selectedStartTime, selectedDuration]);

  // ========== FORM SETUP ==========
  const validationSchema = useMemo(() => getBookingSchema(spot.is_accessible), [spot.is_accessible]);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      spot_id: spot.id,
      start_time: '',
      end_time: '',
      license_plate: existingBooking?.license_plate || '',
    },
  });

  // Load saved license plate
  useEffect(() => {
    if (!existingBooking) {
      const savedPlate = localStorage.getItem('last_license_plate');
      if (savedPlate) {
        setValue('license_plate', savedPlate, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [existingBooking, setValue]);

  // Sync times to form
  useEffect(() => {
    if (selectedStartTime) {
      setValue('start_time', selectedStartTime.toISOString(), { shouldValidate: true });
    }
    if (selectedEndTime) {
      setValue('end_time', selectedEndTime.toISOString(), { shouldValidate: true });
    }
  }, [selectedStartTime, selectedEndTime, setValue]);

  const licensePlateWatch = watch('license_plate');

  // ========== HANDLERS ==========

  const handleSuccessComplete = useCallback(() => {
    triggerBookingConfetti();
    if (successData.xpGained) {
      showXPToast(successData.xpGained, successData.leveledUp ?? false, successData.newLevel ?? 1);
    }
    onClose();
  }, [successData, onClose]);

  const handleSlotSelect = useCallback((slot: TimeSlot) => {
    setSelectedSlot(slot);
    setSelectedStartTime(slot.start);
    // Reset duration if it exceeds new slot's max
    if (selectedDuration && selectedDuration > slot.durationMinutes) {
      setSelectedDuration(Math.min(15, slot.durationMinutes));
    } else if (!selectedDuration) {
      setSelectedDuration(15);
    }
  }, [selectedDuration]);

  const handleStartTimeChange = useCallback((time: Date) => {
    setSelectedStartTime(time);
    // Reset duration if it would exceed slot end
    if (selectedSlot && selectedDuration) {
      const newMax = (selectedSlot.end.getTime() - time.getTime()) / (1000 * 60);
      if (selectedDuration > newMax) {
        setSelectedDuration(null);
      }
    }
  }, [selectedSlot, selectedDuration]);

  const handleDurationChange = useCallback((minutes: number) => {
    setSelectedDuration(minutes);
  }, []);

  const onSubmit = async (data: BookingFormInputs) => {
    const formData = new FormData();
    formData.append('license_plate', data.license_plate);
    formData.append('start_time', data.start_time);
    formData.append('end_time', data.end_time);
    formData.append('spot_id', data.spot_id);

    // Append file if present
    if (data.disability_credential && data.disability_credential.length > 0) {
      formData.append('disability_credential', data.disability_credential[0]);
    }

    localStorage.setItem('last_license_plate', data.license_plate);

    let result;
    if (isEditMode && existingBooking) {
      result = await updateBooking(existingBooking.id, formData);
    } else {
      result = await createBooking(formData);
    }

    if (result.success) {
      if (!isEditMode) {
        const xpResult = result as { xpGained?: number; leveledUp?: boolean; newLevel?: number };
        setSuccessData({
          show: true,
          xpGained: xpResult.xpGained,
          leveledUp: xpResult.leveledUp,
          newLevel: xpResult.newLevel
        });
        window.dispatchEvent(new CustomEvent('booking:created'));
      } else {
        onClose();
      }
    } else {
      setError('root.serverError', { type: 'manual', message: result.message });
    }
  };

  // ========== RENDER ==========
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="px-1">
      <div className="flex flex-col gap-6">
        {/* License Plate Input */}
        <div className="flex flex-col gap-3 mt-1">
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
            />
          </div>
          {errors.license_plate && (
            <p className="text-sm text-red-500 text-center">{errors.license_plate.message as string}</p>
          )}
        </div>

        {/* Accessible Credential Upload */}
        {spot.is_accessible && (
          <div className="flex flex-col gap-3">
            <label htmlFor="disability_credential" className="text-sm font-bold text-[#0d171c] dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500">accessible</span>
              Credencial de Discapacidad
              <span className="text-xs font-normal text-gray-500">(Obligatorio para este uso)</span>
            </label>
            <input
              id="disability_credential"
              type="file"
              accept="image/*,.pdf"
              {...register('disability_credential', { required: 'Debes subir tu credencial.' })}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
            />
            {errors.disability_credential && (
              <p className="text-sm text-red-500 text-center">{errors.disability_credential.message as string}</p>
            )}
          </div>
        )}

        {/* Time Slot Selection (New!) */}
        {!isEditMode && (
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-[#0d171c] dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Horarios Disponibles
            </label>
            {isLoadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <TimeSlotPicker
                  availableSlots={availableSlots}
                  existingBookings={allBookings}
                  userUnitId={userUnitId}
                  selectedSlot={selectedSlot}
                  onSelectSlot={handleSlotSelect}
                />
                {/* Time limit info message */}
                {maxBookingAheadMinutes < 1440 && (
                  <m.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                  >
                    <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Puedes reservar hasta <span className="font-semibold">{maxAheadLabel}</span> en adelante
                    </p>
                  </m.div>
                )}
              </>
            )}
          </div>
        )}

        {/* Start Time Fine-Tuning (within selected slot) */}
        <AnimatePresence>
          {selectedSlot && startTimeOptions.length > 1 && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-3 overflow-hidden"
            >
              <label className="text-sm font-semibold text-[#0d171c] dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Comenzar a las
              </label>
              {selectedStartTime && (
                <TimeCarousel
                  times={startTimeOptions}
                  selectedTime={selectedStartTime}
                  onSelect={handleStartTimeChange}
                />
              )}
            </m.div>
          )}
        </AnimatePresence>

        {/* Duration Selection */}
        <AnimatePresence>
          {selectedSlot && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-3 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[#0d171c] dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Reservar por
                </label>
                {selectedDuration && selectedEndTime && (
                  <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-bold">
                    hasta {formatTime(selectedEndTime)}
                  </span>
                )}
              </div>
              <DurationPills
                options={DURATION_OPTIONS}
                selectedDuration={selectedDuration}
                onSelect={handleDurationChange}
                maxDuration={maxDuration}
              />
              {maxDuration < MAX_BOOKING_DURATION_HOURS * 60 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  Máximo hasta {formatTime(selectedSlot.end)} (fin del horario disponible)
                </p>
              )}
            </m.div>
          )}
        </AnimatePresence>

        {/* Live Summary */}
        <AnimatePresence>
          {licensePlateWatch && selectedEndTime && selectedStartTime && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <BookingSummary
                spotName={spot.name || 'Sin nombre'}
                licensePlate={licensePlateWatch}
                startTime={selectedStartTime}
                endTime={selectedEndTime}
              />
            </m.div>
          )}
        </AnimatePresence>

        {/* Hidden inputs */}
        <input type="hidden" {...register('start_time')} />
        <input type="hidden" {...register('end_time')} />
        <input type="hidden" {...register('spot_id')} />

        {/* Errors */}
        {errors.root?.serverError && (
          <p className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            {(errors.root.serverError as any).message}
          </p>
        )}

        {/* Submit Button */}
        <div className="sticky bottom-0 -mx-4 px-4 pt-4 pb-2 bg-background border-t border-gray-100 dark:border-gray-800 mt-4 z-10">
          <Button
            type="submit"
            disabled={!licensePlateWatch || !selectedDuration || !selectedSlot || isSubmitting}
            className="w-full h-12 text-base font-bold shadow-lg shadow-primary/30 gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {isEditMode ? <Edit3 className="w-4 h-4" /> : <CheckCircle2 className="w-5 h-5" />}
                {isEditMode ? 'Actualizar Reserva' : 'Confirmar Reserva'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Success Overlay */}
      <BookingSuccessOverlay
        isVisible={successData.show}
        onComplete={handleSuccessComplete}
        spotName={spot.name}
      />
    </form>
  );
};

export default BookingForm;
