'use client';

import { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Car, Check, Sparkles } from 'lucide-react';

interface BookingSuccessOverlayProps {
    isVisible: boolean;
    onComplete: () => void;
    spotName?: string;
    duration?: number; // milliseconds before auto-dismiss
}

/**
 * BookingSuccessOverlay - Animación de éxito de reserva con temática de estacionamiento
 * 
 * Muestra un auto animado entrando a un estacionamiento con un check de confirmación.
 * Se auto-oculta después de la duración especificada y dispara onComplete para el confetti.
 */
export function BookingSuccessOverlay({
    isVisible,
    onComplete,
    spotName,
    duration = 2500
}: BookingSuccessOverlayProps) {
    const [showCheck, setShowCheck] = useState(false);

    useEffect(() => {
        if (isVisible) {
            // Show check after car animation completes
            const checkTimer = setTimeout(() => setShowCheck(true), 800);

            // Auto-dismiss and trigger confetti
            const dismissTimer = setTimeout(() => {
                onComplete();
            }, duration);

            return () => {
                clearTimeout(checkTimer);
                clearTimeout(dismissTimer);
            };
        } else {
            setShowCheck(false);
        }
    }, [isVisible, duration, onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                >
                    <m.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="bg-white dark:bg-[#1a2c35] rounded-3xl p-8 shadow-2xl max-w-xs w-full mx-4 text-center"
                    >
                        {/* Parking Spot Animation Container */}
                        <div className="relative h-32 mb-6">
                            {/* Parking Lines */}
                            <div className="absolute inset-x-4 bottom-0 h-20 flex justify-center">
                                <div className="w-24 h-full border-2 border-dashed border-primary/30 rounded-t-lg relative">
                                    {/* Spot Label */}
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-primary/60 uppercase tracking-wider">
                                        {spotName || 'Reservado'}
                                    </div>

                                    {/* Car sliding in */}
                                    <m.div
                                        initial={{ y: -80, opacity: 0 }}
                                        animate={{ y: 6, opacity: 1 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 120,
                                            damping: 15,
                                            delay: 0.2
                                        }}
                                        className="absolute inset-x-2 top-2 flex justify-center"
                                    >
                                        <div className="w-16 h-10 bg-gradient-to-b from-primary to-primary/80 rounded-lg shadow-lg flex items-center justify-center">
                                            <Car className="w-8 h-8 text-white" />
                                        </div>
                                    </m.div>
                                </div>
                            </div>

                            {/* Success Check Badge */}
                            <AnimatePresence>
                                {showCheck && (
                                    <m.div
                                        initial={{ scale: 0, y: 20 }}
                                        animate={{ scale: 1, y: 0 }}
                                        exit={{ scale: 0 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                        className="absolute top-0 right-4"
                                    >
                                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg ring-4 ring-green-500/20">
                                            <Check className="w-7 h-7 text-white" strokeWidth={3} />
                                        </div>
                                    </m.div>
                                )}
                            </AnimatePresence>

                            {/* Sparkles */}
                            <AnimatePresence>
                                {showCheck && (
                                    <>
                                        <m.div
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.1 }}
                                            className="absolute top-2 left-6"
                                        >
                                            <Sparkles className="w-5 h-5 text-yellow-400" />
                                        </m.div>
                                        <m.div
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.2 }}
                                            className="absolute bottom-4 right-2"
                                        >
                                            <Sparkles className="w-4 h-4 text-primary" />
                                        </m.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Success Text */}
                        <m.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                                ¡Reserva Confirmada!
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Tu estacionamiento está listo
                            </p>
                        </m.div>

                        {/* XP Badge (optional, shown if xpGained provided) */}
                        <m.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.7 }}
                            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-full text-amber-700 dark:text-amber-300 text-sm font-semibold"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>+10 XP</span>
                        </m.div>
                    </m.div>
                </m.div>
            )}
        </AnimatePresence>
    );
}
