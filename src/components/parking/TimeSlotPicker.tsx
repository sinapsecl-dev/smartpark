'use client';

import React, { useMemo } from 'react';
import { Tables } from '@/types/supabase';
import { m, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Clock, Calendar, ChevronRight, Lock, Check } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export interface TimeSlot {
    start: Date;
    end: Date;
    durationMinutes: number;
}

interface BookingSlot {
    type: 'booking';
    booking: Tables<'bookings'> & { units?: { name: string | null } | null };
    start: Date;
    end: Date;
    isOwn: boolean;
}

interface FreeSlot {
    type: 'free';
    start: Date;
    end: Date;
    durationMinutes: number;
}

type DisplaySlot = BookingSlot | FreeSlot;

interface TimeSlotPickerProps {
    availableSlots: TimeSlot[];
    existingBookings: (Tables<'bookings'> & { units?: { name: string | null } | null })[];
    userUnitId: string;
    selectedSlot: TimeSlot | null;
    onSelectSlot: (slot: TimeSlot) => void;
    className?: string;
}

// ============================================================
// UTILITIES
// ============================================================

const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const formatDuration = (minutes: number): string => {
    // Round to nearest 15 minutes to avoid floating point errors
    const roundedMinutes = Math.round(minutes / 15) * 15;
    if (roundedMinutes >= 60) {
        const hours = Math.floor(roundedMinutes / 60);
        const mins = roundedMinutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${roundedMinutes} min`;
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface SlotCardProps {
    slot: DisplaySlot;
    isSelected?: boolean;
    onClick?: () => void;
    index: number;
}

const SlotCard: React.FC<SlotCardProps> = ({ slot, isSelected, onClick, index }) => {
    const isFree = slot.type === 'free';
    const isBooking = slot.type === 'booking';

    return (
        <m.button
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={isFree ? onClick : undefined}
            disabled={!isFree}
            className={clsx(
                'w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl transition-all text-left',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                isFree && [
                    'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
                    isSelected
                        ? 'bg-primary text-white ring-2 ring-primary shadow-lg shadow-primary/30'
                        : 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500'
                ],
                isBooking && [
                    'cursor-not-allowed bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
                ]
            )}
        >
            {/* Icon */}
            <div className={clsx(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                isFree && (isSelected ? 'bg-white/20' : 'bg-emerald-500/10'),
                isBooking && (slot.isOwn ? 'bg-primary/10' : 'bg-gray-200 dark:bg-gray-700')
            )}>
                {isFree ? (
                    isSelected ? (
                        <Check className="w-5 h-5 text-white" />
                    ) : (
                        <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    )
                ) : (
                    <Lock className={clsx('w-5 h-5', slot.isOwn ? 'text-primary' : 'text-gray-400')} />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={clsx(
                        'font-semibold text-sm',
                        isFree && (isSelected ? 'text-white' : 'text-emerald-700 dark:text-emerald-300'),
                        isBooking && (slot.isOwn ? 'text-primary' : 'text-gray-600 dark:text-gray-300')
                    )}>
                        {formatTime(slot.start)} - {formatTime(slot.end)}
                    </span>
                    {isBooking && slot.isOwn && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary text-white">
                            Tu reserva
                        </span>
                    )}
                </div>
                <span className={clsx(
                    'text-xs truncate block',
                    isFree && (isSelected ? 'text-white/80' : 'text-emerald-600/70 dark:text-emerald-400/70'),
                    isBooking && 'text-gray-500 dark:text-gray-400'
                )}>
                    {isFree
                        ? `${formatDuration(slot.durationMinutes)} disponibles`
                        : (slot.booking.units?.name || 'Reservado')
                    }
                </span>
            </div>

            {/* Action indicator */}
            {isFree && !isSelected && (
                <ChevronRight className="w-4 h-4 text-emerald-400 dark:text-emerald-500 flex-shrink-0" />
            )}
        </m.button>
    );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
    availableSlots,
    existingBookings,
    userUnitId,
    selectedSlot,
    onSelectSlot,
    className
}) => {
    // Merge and sort all slots chronologically
    const displaySlots = useMemo((): DisplaySlot[] => {
        const all: DisplaySlot[] = [];

        // Add free slots
        for (const slot of availableSlots) {
            all.push({
                type: 'free',
                start: slot.start,
                end: slot.end,
                durationMinutes: slot.durationMinutes
            });
        }

        // Add booking slots
        for (const booking of existingBookings) {
            all.push({
                type: 'booking',
                booking,
                start: new Date(booking.start_time),
                end: new Date(booking.end_time),
                isOwn: booking.unit_id === userUnitId
            });
        }

        // Sort by start time
        return all.sort((a, b) => a.start.getTime() - b.start.getTime());
    }, [availableSlots, existingBookings, userUnitId]);

    const hasFreeSlots = availableSlots.length > 0;
    const today = new Date().toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    return (
        <div className={clsx('flex flex-col gap-3', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-[#0d171c] dark:text-white capitalize">
                        {today}
                    </span>
                </div>
                {hasFreeSlots && (
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full font-medium">
                        {availableSlots.length} horario{availableSlots.length !== 1 ? 's' : ''} disponible{availableSlots.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Slot List */}
            <AnimatePresence mode="wait">
                {displaySlots.length === 0 ? (
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8 text-gray-500 dark:text-gray-400"
                    >
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay horarios disponibles hoy</p>
                    </m.div>
                ) : (
                    <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                        {displaySlots.map((slot, index) => {
                            const isSelected = !!(selectedSlot &&
                                slot.type === 'free' &&
                                slot.start.getTime() === selectedSlot.start.getTime());

                            return (
                                <SlotCard
                                    key={`${slot.type}-${slot.start.toISOString()}`}
                                    slot={slot}
                                    isSelected={isSelected}
                                    onClick={() => {
                                        if (slot.type === 'free') {
                                            onSelectSlot({
                                                start: slot.start,
                                                end: slot.end,
                                                durationMinutes: slot.durationMinutes
                                            });
                                        }
                                    }}
                                    index={index}
                                />
                            );
                        })}
                    </div>
                )}
            </AnimatePresence>

            {/* Helper text */}
            {hasFreeSlots && !selectedSlot && (
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 animate-pulse">
                    Selecciona un horario disponible para continuar
                </p>
            )}
        </div>
    );
};

export default TimeSlotPicker;
