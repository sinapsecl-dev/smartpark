'use client';

import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
    AlertTriangle,
    X,
    Send,
    CheckCircle2,
    Car,
    Clock,
    Shield,
    AlertCircle,
    MessageSquare,
    Camera
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================
// PROBLEM OPTIONS
// ============================================================

const OCCUPIED_PROBLEMS = [
    {
        id: 'no-vehicle',
        icon: Car,
        title: 'Estacionamiento vacío',
        description: 'El cupo está reservado pero no hay ningún vehículo',
        requiresPlate: false
    },
    {
        id: 'wrong-vehicle',
        icon: AlertCircle,
        title: 'Vehículo incorrecto',
        description: 'Hay un vehículo diferente al registrado en la reserva',
        requiresPlate: true
    },
    {
        id: 'overstay',
        icon: Clock,
        title: 'Tiempo excedido',
        description: 'El vehículo no ha liberado el cupo y la reserva ya terminó',
        requiresPlate: false
    },
    {
        id: 'other',
        icon: MessageSquare,
        title: 'Otro problema',
        description: 'Reportar una situación diferente',
        requiresPlate: false
    }
];

const FREE_SPOT_PROBLEMS = [
    {
        id: 'unauthorized-vehicle',
        icon: Shield,
        title: 'Vehículo sin reserva',
        description: 'Hay un vehículo estacionado sin reserva activa',
        requiresPlate: true
    },
    {
        id: 'spot-blocked',
        icon: AlertTriangle,
        title: 'Cupo bloqueado',
        description: 'El espacio está obstruido por objetos o conos',
        requiresPlate: false
    },
    {
        id: 'other-free',
        icon: MessageSquare,
        title: 'Otro problema',
        description: 'Reportar una situación diferente',
        requiresPlate: false
    }
];

// ============================================================
// PROPS
// ============================================================

interface ReportProblemDialogProps {
    isOpen: boolean;
    onClose: () => void;
    spotName: string;
    isFreeSpot?: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

const ReportProblemDialog: React.FC<ReportProblemDialogProps> = ({
    isOpen,
    onClose,
    spotName,
    isFreeSpot = false
}) => {
    const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
    const [licensePlate, setLicensePlate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const problems = isFreeSpot ? FREE_SPOT_PROBLEMS : OCCUPIED_PROBLEMS;
    const selectedOption = problems.find(p => p.id === selectedProblem);
    const requiresPlate = selectedOption?.requiresPlate ?? false;

    const handleSubmit = async () => {
        if (!selectedProblem) return;
        if (requiresPlate && !licensePlate.trim()) return;

        setIsSubmitting(true);
        // Simular envío (demo - 1.5 segundos)
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSubmitting(false);
        setIsSuccess(true);
    };

    const handleClose = () => {
        setSelectedProblem(null);
        setLicensePlate('');
        setIsSuccess(false);
        onClose();
    };

    const canSubmit = selectedProblem && (!requiresPlate || licensePlate.trim().length >= 4);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={handleClose}
            >
                <m.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-white dark:bg-[#152028] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[#0d171c] dark:text-white">
                                    Reportar Problema
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {spotName} • {isFreeSpot ? 'Cupo Libre' : 'Cupo Ocupado'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        <AnimatePresence mode="wait">
                            {isSuccess ? (
                                <m.div
                                    key="success"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-center py-8"
                                >
                                    <m.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', delay: 0.2 }}
                                        className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4"
                                    >
                                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                    </m.div>
                                    <h4 className="text-lg font-bold text-[#0d171c] dark:text-white mb-2">
                                        ¡Reporte Enviado!
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                        Tu comentario ha sido enviado a la Administración para su revisión.
                                        Gracias por ayudar a mantener el orden del estacionamiento.
                                    </p>
                                    <Button onClick={handleClose} className="w-full">
                                        Cerrar
                                    </Button>
                                </m.div>
                            ) : (
                                <m.div
                                    key="form"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                        {isFreeSpot
                                            ? '¿Hay un problema con este cupo libre?'
                                            : 'Selecciona el tipo de problema que deseas reportar:'
                                        }
                                    </p>

                                    <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                                        {problems.map((option, index) => {
                                            const Icon = option.icon;
                                            const isSelected = selectedProblem === option.id;

                                            return (
                                                <m.button
                                                    key={option.id}
                                                    type="button"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    onClick={() => setSelectedProblem(option.id)}
                                                    className={clsx(
                                                        'w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all',
                                                        'focus:outline-none focus:ring-2 focus:ring-primary/50',
                                                        isSelected
                                                            ? 'bg-primary text-white ring-2 ring-primary shadow-lg'
                                                            : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-700'
                                                    )}
                                                >
                                                    <div className={clsx(
                                                        'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                                                        isSelected ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'
                                                    )}>
                                                        <Icon className={clsx(
                                                            'w-4 h-4',
                                                            isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                                                        )} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className={clsx(
                                                            'font-semibold text-sm block',
                                                            isSelected ? 'text-white' : 'text-[#0d171c] dark:text-white'
                                                        )}>
                                                            {option.title}
                                                        </span>
                                                        <span className={clsx(
                                                            'text-xs block',
                                                            isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                                                        )}>
                                                            {option.description}
                                                        </span>
                                                    </div>
                                                </m.button>
                                            );
                                        })}
                                    </div>

                                    {/* License Plate Input (when required) */}
                                    <AnimatePresence>
                                        {requiresPlate && (
                                            <m.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-4 overflow-hidden"
                                            >
                                                <label className="text-sm font-semibold text-[#0d171c] dark:text-white flex items-center gap-2 mb-2">
                                                    <Car className="w-4 h-4 text-primary" />
                                                    Patente del vehículo
                                                    <span className="text-xs font-normal text-gray-500">(requerido)</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={licensePlate}
                                                        onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                                                        placeholder="Ej: AB-CD-12"
                                                        maxLength={10}
                                                        className={clsx(
                                                            'w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-[#101c22]',
                                                            'text-[#0d171c] dark:text-white uppercase font-mono tracking-widest text-center text-lg',
                                                            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                                                            'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                                                        )}
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2" title="Próximamente: captura de imagen">
                                                        <Camera className="w-5 h-5 text-gray-400 cursor-not-allowed" />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 text-center">
                                                    📷 Próximamente: captura de imagen del vehículo
                                                </p>
                                            </m.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Submit Button */}
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={!canSubmit || isSubmitting}
                                            className="w-full h-11 gap-2"
                                        >
                                            {isSubmitting ? (
                                                <m.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                >
                                                    <Send className="w-4 h-4" />
                                                </m.div>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    Enviar Reporte
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </m.div>
                            )}
                        </AnimatePresence>
                    </div>
                </m.div>
            </m.div>
        </AnimatePresence>
    );
};

export default ReportProblemDialog;
