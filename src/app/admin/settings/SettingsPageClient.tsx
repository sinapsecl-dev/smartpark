'use client';

import React, { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Building2, Shield, Save, Loader2, Copy, Check, ChevronDown } from 'lucide-react';
import { updateCondominiumSettings, updateFairPlayRules } from './actions';

interface SettingsPageClientProps {
    condominium: {
        id: string;
        name: string;
        uniqueCode: string;
        address: string;
        contactEmail: string;
        contactPhone: string;
    };
    fairPlayRules: {
        maxReservationDuration: number;
        cooldownPeriod: number;
        weeklyQuotaHours: number;
    };
}

// Mobile-optimized form input component
const FormInput = React.memo(({
    label,
    value,
    onChange,
    type = 'text',
    placeholder = '',
    disabled = false,
    helpText = '',
    icon: Icon = null as any,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    helpText?: string;
    icon?: React.ElementType | null;
}) => (
    <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
        </label>
        <div className="relative">
            {Icon && (
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            )}
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                placeholder={placeholder}
                className={`
          w-full py-3 rounded-xl border border-gray-200 dark:border-gray-600 
          bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
          text-base focus:ring-2 focus:ring-primary focus:border-transparent 
          transition-all touch-manipulation
          ${Icon ? 'pl-10 pr-4' : 'px-4'}
          ${disabled ? 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : ''}
        `}
            />
        </div>
        {helpText && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{helpText}</p>
        )}
    </div>
));
FormInput.displayName = 'FormInput';

// Mobile-optimized number input with +/- buttons
const NumberInput = React.memo(({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    unit = '',
    helpText = '',
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    unit?: string;
    helpText?: string;
}) => (
    <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
        </label>
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={() => onChange(Math.max(min, value - 1))}
                className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center 
                   text-xl font-bold text-gray-600 dark:text-gray-300 active:bg-gray-200 
                   dark:active:bg-gray-600 transition-colors touch-manipulation select-none"
                aria-label="Decrementar"
            >
                −
            </button>
            <div className="flex-1 text-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                    {value}
                </span>
                {unit && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">{unit}</span>
                )}
            </div>
            <button
                type="button"
                onClick={() => onChange(Math.min(max, value + 1))}
                className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center 
                   text-xl font-bold text-gray-600 dark:text-gray-300 active:bg-gray-200 
                   dark:active:bg-gray-600 transition-colors touch-manipulation select-none"
                aria-label="Incrementar"
            >
                +
            </button>
        </div>
        {helpText && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">{helpText}</p>
        )}
    </div>
));
NumberInput.displayName = 'NumberInput';

// Collapsible section for mobile
const CollapsibleSection = React.memo(({
    title,
    description,
    icon: Icon,
    iconColor = 'text-primary bg-primary/10',
    children,
    defaultOpen = true,
}: {
    title: string;
    description: string;
    icon: React.ElementType;
    iconColor?: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#1a2c35] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 sm:p-6 flex items-center gap-3 sm:gap-4 text-left touch-manipulation"
            >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${iconColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                        {title}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                        {description}
                    </p>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                </motion.div>
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});
CollapsibleSection.displayName = 'CollapsibleSection';

export default function SettingsPageClient({ condominium, fairPlayRules }: SettingsPageClientProps) {
    const [isPending, startTransition] = useTransition();
    const [copied, setCopied] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Condominium form state
    const [condoForm, setCondoForm] = useState({
        name: condominium.name,
        address: condominium.address,
        contactEmail: condominium.contactEmail,
        contactPhone: condominium.contactPhone,
    });

    // Fair Play rules form state
    const [rulesForm, setRulesForm] = useState({
        maxReservationDuration: fairPlayRules.maxReservationDuration,
        cooldownPeriod: fairPlayRules.cooldownPeriod,
        weeklyQuotaHours: fairPlayRules.weeklyQuotaHours,
    });

    const handleCopyCode = async () => {
        await navigator.clipboard.writeText(condominium.uniqueCode);
        setCopied(true);
        // Haptic feedback on mobile if available
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSaveCondominium = () => {
        startTransition(async () => {
            const result = await updateCondominiumSettings(condominium.id, condoForm);
            if (result.success) {
                setSuccessMessage('Configuración guardada');
                if ('vibrate' in navigator) navigator.vibrate([50, 50, 50]);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        });
    };

    const handleSaveRules = () => {
        startTransition(async () => {
            const result = await updateFairPlayRules(rulesForm);
            if (result.success) {
                setSuccessMessage('Reglas actualizadas');
                if ('vibrate' in navigator) navigator.vibrate([50, 50, 50]);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        });
    };

    return (
        <main className="flex-1 flex flex-col w-full">
            {/* Fixed Header for Mobile */}
            <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-4 py-3 sm:px-6 sm:py-4">
                <div className="max-w-3xl mx-auto flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white truncate">
                            Configuración
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                            Ajustes del condominio y sistema
                        </p>
                    </div>
                </div>
            </div>

            {/* Success Toast - Fixed on Mobile */}
            <AnimatePresence>
                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50"
                    >
                        <div className="bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
                            <Check className="w-5 h-5 flex-shrink-0" />
                            <span className="font-medium">{successMessage}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content */}
            <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
                <div className="max-w-3xl mx-auto flex flex-col gap-4 sm:gap-6">
                    {/* Access Code Card - Prominently displayed */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 
                       rounded-2xl p-4 sm:p-6 border border-primary/20"
                    >
                        <p className="text-xs sm:text-sm font-medium text-primary mb-2">
                            Código de Acceso para Residentes
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 border border-primary/30">
                                <span className="text-xl sm:text-2xl font-mono font-bold text-gray-900 dark:text-white tracking-wider">
                                    {condominium.uniqueCode}
                                </span>
                            </div>
                            <button
                                onClick={handleCopyCode}
                                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center 
                           transition-all touch-manipulation active:scale-95 ${copied
                                        ? 'bg-green-600 text-white'
                                        : 'bg-primary text-white hover:bg-primary/90'
                                    }`}
                                aria-label="Copiar código"
                            >
                                {copied ? <Check className="w-5 h-5 sm:w-6 sm:h-6" /> : <Copy className="w-5 h-5 sm:w-6 sm:h-6" />}
                            </button>
                        </div>
                        <p className="text-xs text-primary/80 mt-2">
                            Comparte este código con los nuevos residentes
                        </p>
                    </motion.div>

                    {/* Condominium Settings */}
                    <CollapsibleSection
                        title="Información del Condominio"
                        description="Datos generales de contacto"
                        icon={Building2}
                    >
                        <div className="space-y-4">
                            <FormInput
                                label="Nombre del Condominio"
                                value={condoForm.name}
                                onChange={(v) => setCondoForm({ ...condoForm, name: v })}
                                placeholder="Ej: Terrazas del Sol V"
                            />
                            <FormInput
                                label="Dirección"
                                value={condoForm.address}
                                onChange={(v) => setCondoForm({ ...condoForm, address: v })}
                                placeholder="Ej: Av. Principal 123"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormInput
                                    label="Email de Contacto"
                                    type="email"
                                    value={condoForm.contactEmail}
                                    onChange={(v) => setCondoForm({ ...condoForm, contactEmail: v })}
                                    placeholder="admin@condominio.cl"
                                />
                                <FormInput
                                    label="Teléfono"
                                    type="tel"
                                    value={condoForm.contactPhone}
                                    onChange={(v) => setCondoForm({ ...condoForm, contactPhone: v })}
                                    placeholder="+56 9 1234 5678"
                                />
                            </div>
                            <button
                                onClick={handleSaveCondominium}
                                disabled={isPending}
                                className="w-full sm:w-auto sm:ml-auto py-3 px-6 bg-primary hover:bg-primary/90 
                         text-white font-semibold rounded-xl transition-all flex items-center 
                         justify-center gap-2 disabled:opacity-50 touch-manipulation active:scale-[0.98]"
                            >
                                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Guardar Cambios
                            </button>
                        </div>
                    </CollapsibleSection>

                    {/* Fair Play Rules */}
                    <CollapsibleSection
                        title="Reglas Fair Play"
                        description="Límites de uso del estacionamiento"
                        icon={Shield}
                        iconColor="bg-amber-500/10 text-amber-500"
                    >
                        <div className="space-y-6">
                            <NumberInput
                                label="Duración Máxima por Reserva"
                                value={rulesForm.maxReservationDuration}
                                onChange={(v) => setRulesForm({ ...rulesForm, maxReservationDuration: v })}
                                min={1}
                                max={24}
                                unit="horas"
                                helpText="Tiempo máximo que un residente puede reservar en una sola sesión"
                            />
                            <div className="border-t border-gray-100 dark:border-gray-700" />
                            <NumberInput
                                label="Período de Enfriamiento"
                                value={rulesForm.cooldownPeriod}
                                onChange={(v) => setRulesForm({ ...rulesForm, cooldownPeriod: v })}
                                min={0}
                                max={24}
                                unit="horas"
                                helpText="Tiempo de espera obligatorio entre reservas consecutivas"
                            />
                            <div className="border-t border-gray-100 dark:border-gray-700" />
                            <NumberInput
                                label="Cuota Semanal"
                                value={rulesForm.weeklyQuotaHours}
                                onChange={(v) => setRulesForm({ ...rulesForm, weeklyQuotaHours: v })}
                                min={1}
                                max={168}
                                unit="horas"
                                helpText="Máximo de horas que cada unidad puede usar por semana"
                            />
                            <button
                                onClick={handleSaveRules}
                                disabled={isPending}
                                className="w-full py-3 px-6 bg-amber-500 hover:bg-amber-600 text-white 
                         font-semibold rounded-xl transition-all flex items-center justify-center 
                         gap-2 disabled:opacity-50 touch-manipulation active:scale-[0.98]"
                            >
                                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Actualizar Reglas
                            </button>
                        </div>
                    </CollapsibleSection>

                    {/* Bottom spacing for mobile navigation */}
                    <div className="h-4 sm:h-8" />
                </div>
            </div>
        </main>
    );
}
