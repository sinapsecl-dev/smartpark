'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
    X,
    AlertTriangle,
    DollarSign,
    Ban,
    Clock,
    Check,
    Plus,
    CircleOff
} from 'lucide-react';
import {
    getUnitSanctions,
    createSanction,
    liftSanction,
    type SanctionWithCreator,
} from '@/app/lib/sanction-actions';
import { type SanctionType, SANCTION_TYPE_LABELS } from '@/lib/constants';

// ============================================================
// TYPES
// ============================================================

interface SanctionDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    unitId: string;
    unitName: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const DURATION_OPTIONS = [
    { value: 7, label: '7 días' },
    { value: 14, label: '14 días' },
    { value: 30, label: '30 días' },
    { value: 60, label: '60 días' },
    { value: 90, label: '90 días' },
    { value: null, label: 'Indefinido' },
];

const SANCTION_ICONS: Record<SanctionType, React.ComponentType<{ className?: string }>> = {
    fine: AlertTriangle,
    debt: DollarSign,
    fee: DollarSign,
    other: Ban,
};

const SANCTION_COLORS: Record<SanctionType, string> = {
    fine: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    debt: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    fee: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400',
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export function SanctionDrawer({ isOpen, onClose, unitId, unitName }: SanctionDrawerProps) {
    const [sanctions, setSanctions] = useState<SanctionWithCreator[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Form state
    const [formType, setFormType] = useState<SanctionType>('fine');
    const [formReason, setFormReason] = useState('');
    const [formAmount, setFormAmount] = useState('');
    const [formDuration, setFormDuration] = useState<number | null>(7);

    // Load sanctions when drawer opens
    useEffect(() => {
        if (isOpen && unitId) {
            loadSanctions();
        }
    }, [isOpen, unitId]);

    const loadSanctions = async () => {
        setIsLoading(true);
        const result = await getUnitSanctions(unitId);
        if (result.success) {
            setSanctions(result.sanctions);
        }
        setIsLoading(false);
    };

    const handleCreateSanction = () => {
        startTransition(async () => {
            const result = await createSanction({
                unitId,
                sanctionType: formType,
                reason: formReason || undefined,
                amount: formAmount ? parseFloat(formAmount) : undefined,
                durationDays: formDuration,
            });

            if (result.success) {
                setShowAddForm(false);
                setFormReason('');
                setFormAmount('');
                setFormType('fine');
                setFormDuration(7);
                loadSanctions();
            }
        });
    };

    const handleLiftSanction = (sanctionId: string) => {
        startTransition(async () => {
            const result = await liftSanction(sanctionId);
            if (result.success) {
                loadSanctions();
            }
        });
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Indefinido';
        return new Date(dateStr).toLocaleDateString('es-CL', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const activeSanctions = sanctions.filter(s => s.is_active);
    const historySanctions = sanctions.filter(s => !s.is_active);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    />

                    {/* Drawer */}
                    <m.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Sanciones
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Unidad {unitName}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <>
                                    {/* Add Sanction Button */}
                                    {!showAddForm && (
                                        <button
                                            onClick={() => setShowAddForm(true)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl 
                        bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Agregar Sanción
                                        </button>
                                    )}

                                    {/* Add Sanction Form */}
                                    <AnimatePresence>
                                        {showAddForm && (
                                            <m.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-4"
                                            >
                                                <h3 className="font-medium text-gray-900 dark:text-white">
                                                    Nueva Sanción
                                                </h3>

                                                {/* Type Selector */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(Object.keys(SANCTION_TYPE_LABELS) as SanctionType[]).map((type) => {
                                                        const Icon = SANCTION_ICONS[type];
                                                        const isSelected = formType === type;
                                                        return (
                                                            <button
                                                                key={type}
                                                                onClick={() => setFormType(type)}
                                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
                                  ${isSelected
                                                                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                                                            >
                                                                <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-600' : 'text-gray-500'}`} />
                                                                <span className={`text-sm ${isSelected ? 'font-medium text-amber-700 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                    {SANCTION_TYPE_LABELS[type].label}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Reason */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        Motivo (opcional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formReason}
                                                        onChange={(e) => setFormReason(e.target.value)}
                                                        placeholder="Ej: Multa por exceso de tiempo"
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                              bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                                    />
                                                </div>

                                                {/* Amount (for fine/debt/fee) */}
                                                {(formType === 'fine' || formType === 'debt' || formType === 'fee') && (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Monto (opcional)
                                                        </label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                                            <input
                                                                type="number"
                                                                value={formAmount}
                                                                onChange={(e) => setFormAmount(e.target.value)}
                                                                placeholder="0"
                                                                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                                  bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Duration */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        Duración
                                                    </label>
                                                    <select
                                                        value={formDuration ?? 'null'}
                                                        onChange={(e) => setFormDuration(e.target.value === 'null' ? null : parseInt(e.target.value))}
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                              bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                                    >
                                                        {DURATION_OPTIONS.map((opt) => (
                                                            <option key={opt.label} value={opt.value ?? 'null'}>
                                                                {opt.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2 pt-2">
                                                    <button
                                                        onClick={() => setShowAddForm(false)}
                                                        className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                              text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={handleCreateSanction}
                                                        disabled={isPending}
                                                        className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white 
                              font-medium transition-colors disabled:opacity-50"
                                                    >
                                                        {isPending ? 'Guardando...' : 'Aplicar Sanción'}
                                                    </button>
                                                </div>
                                            </m.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Active Sanctions */}
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                                            Sanciones Activas ({activeSanctions.length})
                                        </h3>

                                        {activeSanctions.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                <Check className="w-10 h-10 mx-auto mb-2 text-green-500" />
                                                <p className="text-sm">Sin sanciones activas</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {activeSanctions.map((sanction) => {
                                                    const Icon = SANCTION_ICONS[sanction.sanction_type];
                                                    return (
                                                        <m.div
                                                            key={sanction.id}
                                                            layout
                                                            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex items-start gap-3">
                                                                    <div className={`p-2 rounded-lg ${SANCTION_COLORS[sanction.sanction_type]}`}>
                                                                        <Icon className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                                            {SANCTION_TYPE_LABELS[sanction.sanction_type].label}
                                                                        </p>
                                                                        {sanction.reason && (
                                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                                                                {sanction.reason}
                                                                            </p>
                                                                        )}
                                                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                                                            <span className="flex items-center gap-1">
                                                                                <Clock className="w-3 h-3" />
                                                                                {sanction.ends_at ? `Hasta ${formatDate(sanction.ends_at)}` : 'Indefinido'}
                                                                            </span>
                                                                            {sanction.amount && (
                                                                                <span>${sanction.amount.toLocaleString('es-CL')}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleLiftSanction(sanction.id)}
                                                                    disabled={isPending}
                                                                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg 
                                    bg-green-100 text-green-700 hover:bg-green-200 
                                    dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50
                                    transition-colors disabled:opacity-50"
                                                                >
                                                                    <CircleOff className="w-3 h-3" />
                                                                    Levantar
                                                                </button>
                                                            </div>
                                                        </m.div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* History */}
                                    {historySanctions.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                                                Historial ({historySanctions.length})
                                            </h3>
                                            <div className="space-y-2">
                                                {historySanctions.map((sanction) => (
                                                    <div
                                                        key={sanction.id}
                                                        className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 opacity-60"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                                {SANCTION_TYPE_LABELS[sanction.sanction_type].label}
                                                                {sanction.reason && ` - ${sanction.reason}`}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                Levantada {formatDate(sanction.lifted_at)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </m.div>
                </>
            )}
        </AnimatePresence>
    );
}
