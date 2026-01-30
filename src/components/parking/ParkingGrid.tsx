'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import SpotCard from './SpotCard';
import BookingForm from './BookingForm';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { SpotCardSkeleton } from './SpotCardSkeleton';
import { ResponsiveDialog } from '@/components/shared/ResponsiveDialog';
import { motion, AnimatePresence } from 'framer-motion';
import SpotDetails from './SpotDetails';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

type Spot = Tables<'spots'>;
type Booking = Tables<'bookings'>;

type BookingWithUnits = Booking & { units?: { name: string | null } | null };

interface ParkingGridProps {
  userUnitId: string;
}

type SubscriptionStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

type DialogMode = 'details' | 'booking' | 'edit';

const ParkingGrid: React.FC<ParkingGridProps> = ({ userUnitId }) => {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [bookings, setBookings] = useState<BookingWithUnits[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('details');
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithUnits | null>(null);
  const [editingBooking, setEditingBooking] = useState<BookingWithUnits | null>(null);

  const [isSubscribed, setIsSubscribed] = useState(false);

  const supabase = useMemo(() => getSupabaseClient(), []);

  const fetchParkingData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const { data: spotsData, error: spotsError } = await supabase
        .from('spots')
        .select('*')
        .order('name', { ascending: true });

      if (spotsError) {
        console.error('Error fetching spots:', JSON.stringify(spotsError, null, 2));
        return;
      }
      setSpots(spotsData || []);

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, units(name)')
        .or('status.eq.confirmed,status.eq.active')
        .gte('end_time', new Date().toISOString());

      if (bookingsError) {
        console.error('Error fetching bookings:', JSON.stringify(bookingsError, null, 2));
        return;
      }
      setBookings(bookingsData || []);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchParkingData(true);
  }, [fetchParkingData]);

  useEffect(() => {
    console.log('[ParkingGrid] Setting up Realtime subscription...');

    const channelName = `bookings-realtime-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload: RealtimePostgresChangesPayload<Booking>) => {
          console.log('[ParkingGrid] Realtime event received:', payload.eventType, payload);
          fetchParkingData(false);
        }
      )
      .subscribe((status: SubscriptionStatus) => {
        console.log('[ParkingGrid] Subscription status:', status);
        setIsSubscribed(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('[ParkingGrid] Cleaning up Realtime subscription...');
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchParkingData]);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingBooking(null);
  }, []);

  const handleSpotClick = useCallback((spot: Spot, booking?: BookingWithUnits | null) => {
    setSelectedSpot(spot);
    setSelectedBooking(booking || null);

    if (booking) {
      setDialogMode('details');
    } else {
      setDialogMode('booking');
    }
    setIsDialogOpen(true);
  }, []);

  const handleEditBooking = useCallback((booking: BookingWithUnits) => {
    setEditingBooking(booking);
    setDialogMode('edit');
  }, []);

  const handleNewBooking = useCallback(() => {
    setDialogMode('booking');
    setEditingBooking(null);
  }, []);

  const spotStates = useMemo(() => {
    const now = new Date();
    return spots.map(spot => {
      const currentBooking = bookings.find(
        (b) => b.spot_id === spot.id && new Date(b.start_time) <= now && new Date(b.end_time) >= now
      );
      const futureBookings = bookings.filter(
        (b) => b.spot_id === spot.id && new Date(b.start_time) > now
      );
      return { spot, currentBooking, futureBookings };
    });
  }, [spots, bookings]);

  const getDialogTitle = () => {
    if (dialogMode === 'edit') {
      return `Editar Reserva (${selectedSpot?.name})`;
    }
    if (dialogMode === 'booking') {
      return `Nueva Reserva (${selectedSpot?.name})`;
    }
    return `${selectedSpot?.name || 'Estacionamiento'}`;
  };

  const currentSpotFutureBookings = useMemo(() => {
    if (!selectedSpot) return [];
    const now = new Date();
    return bookings.filter(
      (b) => b.spot_id === selectedSpot.id && new Date(b.start_time) > now
    );
  }, [selectedSpot, bookings]);

  return (
    <>
      {/* Realtime Status Indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${isSubscribed
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}>
            <span className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {isSubscribed ? 'Realtime activo' : 'Conectando...'}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => <SpotCardSkeleton key={i} />)}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence mode="popLayout">
            {spotStates.map(({ spot, currentBooking, futureBookings }) => (
              <motion.div
                key={spot.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <SpotCard
                  spot={spot}
                  currentBooking={currentBooking}
                  futureBookings={futureBookings}
                  onSpotClick={handleSpotClick}
                  userUnitId={userUnitId}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <ResponsiveDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={getDialogTitle()}
      >
        <AnimatePresence mode="wait">
          {dialogMode === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <SpotDetails
                spot={selectedSpot}
                booking={selectedBooking}
                futureBookings={currentSpotFutureBookings}
                unitName={selectedBooking?.units?.name || undefined}
                userUnitId={userUnitId}
                onClose={closeDialog}
                onEditBooking={handleEditBooking}
                onNewBooking={handleNewBooking}
              />
            </motion.div>
          )}
          {(dialogMode === 'booking' || dialogMode === 'edit') && selectedSpot && (
            <motion.div
              key="booking"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <BookingForm
                spot={selectedSpot}
                onClose={closeDialog}
                existingBooking={editingBooking}
                futureBookings={currentSpotFutureBookings}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </ResponsiveDialog>
    </>
  );
};

export default ParkingGrid;