'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2, Check, RotateCcw, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface FairPlayRules {
    maxReservationDuration: number;
    cooldownPeriod: number;
    weeklyQuotaHours: number;
}

interface FairPlayRulesFormProps {
    initialValues: FairPlayRules;
    onSave: (values: FairPlayRules) => Promise<void>;
    onViewHistory?: () => void;
}

const cooldownOptions = [
    { value: 1, label: '1h', fullLabel: '1 Hora' },
    { value: 2, label: '2h', fullLabel: '2 Horas' },
    { value: 4, label: '4h', fullLabel: '4 Horas' },
    { value: 24, label: '24h', fullLabel: '24 Horas' },
];

// Individual rule card component for mobile-first design
interface RuleCardProps {
    icon: string;
    title: string;
    description: string;
    value: number;
    unit: string;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    hasChanged: boolean;
    type?: 'slider' | 'segmented';
    options?: { value: number; label: string }[];
}

const RuleCard: React.FC<RuleCardProps> = ({
    icon,
    title,
    description,
    value,
    unit,
    min,
    max,
    step = 1,
    onChange,
    hasChanged,
    type = 'slider',
    options,
}) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
                'relative rounded-xl p-4 sm:p-5 transition-all duration-300',
                'bg-white dark:bg-[#1e2a32] border-2',
                hasChanged
                    ? 'border-primary/50 shadow-lg shadow-primary/10'
                    : 'border-gray-100 dark:border-gray-700/50'
            )}
        >
            {/* Change indicator */}
            <AnimatePresence>
                {hasChanged && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined text-white text-[14px]">edit</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[#0d171c] dark:text-white truncate">
                        {title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{description}</p>
                </div>
            </div>

            {/* Value Display */}
            <div className="flex items-center justify-center mb-4">
                <motion.div
                    key={value}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-baseline gap-1"
                >
                    <span className="text-4xl font-bold text-primary">{value}</span>
                    <span className="text-lg font-medium text-gray-400">{unit}</span>
                </motion.div>
            </div>

            {/* Control */}
            {type === 'slider' ? (
                <div className="space-y-2">
                    {/* Slider with touch-friendly thumb */}
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={value}
                        onChange={(e) => onChange(parseInt(e.target.value))}
                        className="w-full h-2 appearance-none bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
              [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing
              [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:bg-primary
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg"
                    />
                    {/* Range labels */}
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>{min}{unit}</span>
                        <span>{max}{unit}</span>
                    </div>
                </div>
            ) : (
                /* Segmented control for cooldown */
                <div className="grid grid-cols-4 gap-1.5">
                    {options?.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            className={clsx(
                                'py-2.5 px-2 rounded-lg text-sm font-semibold transition-all duration-200',
                                'active:scale-95 touch-manipulation',
                                value === option.value
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

const FairPlayRulesForm: React.FC<FairPlayRulesFormProps> = ({
    initialValues,
    onSave,
    onViewHistory,
}) => {
    const [values, setValues] = useState<FairPlayRules>(initialValues);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);

    const hasChanges =
        values.maxReservationDuration !== initialValues.maxReservationDuration ||
        values.cooldownPeriod !== initialValues.cooldownPeriod ||
        values.weeklyQuotaHours !== initialValues.weeklyQuotaHours;

    const handleChange = useCallback((field: keyof FairPlayRules, value: number) => {
        setValues((prev) => ({ ...prev, [field]: value }));
        setSaveSuccess(false);
    }, []);

    const handleReset = useCallback(() => {
        setValues(initialValues);
        setSaveSuccess(false);
    }, [initialValues]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(values);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-[#1a2c35] dark:to-[#1e2a32] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
            {/* Header - Collapsible on mobile */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 sm:px-6 py-4 flex items-center justify-between bg-white/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">gavel</span>
                    </div>
                    <div className="text-left">
                        <h2 className="text-[#0d171c] dark:text-white text-base sm:text-lg font-bold leading-tight">
                            Reglas Fair Play
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                            Configuración de límites y restricciones
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {hasChanges && (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                            Sin guardar
                        </span>
                    )}
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    </motion.div>
                </div>
            </button>

            {/* Collapsible Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="p-4 sm:p-6">
                            {/* Rule Cards Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Max Duration */}
                                <RuleCard
                                    icon="schedule"
                                    title="Duración Máxima"
                                    description="Tiempo máximo por reserva"
                                    value={values.maxReservationDuration}
                                    unit="h"
                                    min={1}
                                    max={8}
                                    onChange={(v) => handleChange('maxReservationDuration', v)}
                                    hasChanged={values.maxReservationDuration !== initialValues.maxReservationDuration}
                                />

                                {/* Cooldown Period */}
                                <RuleCard
                                    icon="timer"
                                    title="Periodo de Enfriamiento"
                                    description="Espera entre reservas consecutivas"
                                    value={values.cooldownPeriod}
                                    unit="h"
                                    min={1}
                                    max={24}
                                    onChange={(v) => handleChange('cooldownPeriod', v)}
                                    hasChanged={values.cooldownPeriod !== initialValues.cooldownPeriod}
                                    type="segmented"
                                    options={cooldownOptions}
                                />

                                {/* Weekly Quota */}
                                <RuleCard
                                    icon="data_usage"
                                    title="Cuota Semanal"
                                    description="Horas máximas por unidad/semana"
                                    value={values.weeklyQuotaHours}
                                    unit="h"
                                    min={5}
                                    max={30}
                                    step={5}
                                    onChange={(v) => handleChange('weeklyQuotaHours', v)}
                                    hasChanged={values.weeklyQuotaHours !== initialValues.weeklyQuotaHours}
                                />
                            </div>

                            {/* Actions - Sticky on mobile */}
                            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                {onViewHistory && (
                                    <button
                                        type="button"
                                        onClick={onViewHistory}
                                        className="text-sm text-primary font-medium hover:underline order-3 sm:order-1"
                                    >
                                        Ver historial de cambios
                                    </button>
                                )}

                                <div className="flex gap-3 w-full sm:w-auto order-1 sm:order-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleReset}
                                        disabled={!hasChanges || isSaving}
                                        className="flex-1 sm:flex-none gap-2 h-12 sm:h-10 touch-manipulation"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        <span className="hidden sm:inline">Restablecer</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={!hasChanges || isSaving}
                                        className={clsx(
                                            'flex-1 sm:flex-none gap-2 h-12 sm:h-10 touch-manipulation transition-all',
                                            saveSuccess && 'bg-green-500 hover:bg-green-600'
                                        )}
                                    >
                                        {isSaving ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : saveSuccess ? (
                                            <Check className="h-4 w-4" />
                                        ) : (
                                            <span className="material-symbols-outlined text-[18px]">save</span>
                                        )}
                                        <span>{saveSuccess ? '¡Guardado!' : 'Guardar'}</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default FairPlayRulesForm;
