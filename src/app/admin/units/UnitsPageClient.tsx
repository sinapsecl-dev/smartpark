'use client';

import React, { useState, useTransition, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    Plus,
    Search,
    Edit2,
    Trash2,
    Users,
    Clock,
    AlertTriangle,
    Check,
    X,
    Loader2,
    ChevronRight,
    Home,
    MoreHorizontal,
} from 'lucide-react';
import { createUnit, updateUnit, deleteUnit } from './actions';

interface AssignedUser {
    id: string;
    email: string;
    full_name: string | null;
    status: string;
}

interface Unit {
    id: string;
    name: string;
    status: 'active' | 'delinquent';
    weeklyQuotaHours: number;
    currentWeekUsageMinutes: number;
    lastBookingEndTime: string | null;
    createdAt: string;
    assignedUsers: AssignedUser[];
}

interface UnitsPageClientProps {
    initialUnits: Unit[];
    condominiumId: string;
}

const STATUS_CONFIG = {
    active: {
        label: 'Activo',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        textColor: 'text-green-700 dark:text-green-400'
    },
    delinquent: {
        label: 'Moroso',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-700 dark:text-red-400'
    },
};

// Unit card component
const UnitCard = React.memo(({
    unit,
    onEdit,
    onDelete,
    isPending,
}: {
    unit: Unit;
    onEdit: () => void;
    onDelete: () => void;
    isPending: boolean;
}) => {
    const status = STATUS_CONFIG[unit.status];
    const usageHours = Math.round(unit.currentWeekUsageMinutes / 60 * 10) / 10;
    const usagePercent = Math.min(100, Math.round((usageHours / unit.weeklyQuotaHours) * 100));
    const [showActions, setShowActions] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#1a2c35] rounded-xl p-4 border border-gray-100 dark:border-gray-700"
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Home className="w-6 h-6 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate text-lg">
                                {unit.name}
                            </p>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.textColor}`}>
                                {status.label}
                            </span>
                        </div>

                        {/* Actions Button */}
                        <div className="relative">
                            <button
                                onClick={() => setShowActions(!showActions)}
                                className="w-10 h-10 rounded-xl flex items-center justify-center 
                         bg-gray-50 dark:bg-gray-700 touch-manipulation active:scale-95"
                                aria-label="Acciones"
                            >
                                <MoreHorizontal className="w-5 h-5 text-gray-500" />
                            </button>

                            <AnimatePresence>
                                {showActions && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setShowActions(false)}
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="absolute right-0 top-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg 
                               border border-gray-100 dark:border-gray-700 overflow-hidden z-20 min-w-[140px]"
                                        >
                                            <button
                                                onClick={() => { onEdit(); setShowActions(false); }}
                                                className="w-full px-4 py-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 
                                 hover:bg-gray-50 dark:hover:bg-gray-700 touch-manipulation"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => { onDelete(); setShowActions(false); }}
                                                disabled={isPending}
                                                className="w-full px-4 py-3 flex items-center gap-2 text-sm text-red-600 
                                 hover:bg-red-50 dark:hover:bg-red-900/20 touch-manipulation disabled:opacity-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Eliminar
                                            </button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Usage Bar */}
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Uso semanal
                            </span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                {usageHours}h / {unit.weeklyQuotaHours}h
                            </span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${usagePercent}%` }}
                                className={`h-full rounded-full ${usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-green-500'
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Assigned Users */}
                    {unit.assignedUsers.length > 0 && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Users className="w-3 h-3" />
                            <span>
                                {unit.assignedUsers.length} usuario{unit.assignedUsers.length !== 1 ? 's' : ''} asignado{unit.assignedUsers.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
});
UnitCard.displayName = 'UnitCard';

// Bottom Sheet Modal for Create/Edit Unit
const UnitFormSheet = React.memo(({
    isOpen,
    onClose,
    onSubmit,
    isPending,
    editingUnit,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, weeklyQuota: number, status: 'active' | 'delinquent') => void;
    isPending: boolean;
    editingUnit: Unit | null;
}) => {
    const [name, setName] = useState(editingUnit?.name || '');
    const [weeklyQuota, setWeeklyQuota] = useState(editingUnit?.weeklyQuotaHours || 15);
    const [status, setStatus] = useState<'active' | 'delinquent'>(editingUnit?.status || 'active');

    React.useEffect(() => {
        if (editingUnit) {
            setName(editingUnit.name);
            setWeeklyQuota(editingUnit.weeklyQuotaHours);
            setStatus(editingUnit.status);
        } else {
            setName('');
            setWeeklyQuota(15);
            setStatus('active');
        }
    }, [editingUnit, isOpen]);

    const handleSubmit = () => {
        if (name.trim()) {
            onSubmit(name.trim(), weeklyQuota, status);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-40"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a2c35] 
                     rounded-t-3xl z-50 max-h-[85vh] overflow-y-auto safe-area-inset-bottom"
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                        </div>

                        <div className="px-4 pb-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-primary" />
                                    {editingUnit ? 'Editar Unidad' : 'Nueva Unidad'}
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center touch-manipulation"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Form */}
                            <div className="space-y-5">
                                {/* Name Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nombre de la Unidad
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ej: Casa 101, Depto 2B"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base
                             focus:ring-2 focus:ring-primary focus:border-transparent touch-manipulation"
                                    />
                                </div>

                                {/* Weekly Quota */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Cuota Semanal (horas)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setWeeklyQuota(Math.max(1, weeklyQuota - 1))}
                                            className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center 
                               text-xl font-bold text-gray-600 dark:text-gray-300 active:bg-gray-200 
                               dark:active:bg-gray-600 transition-colors touch-manipulation"
                                        >
                                            −
                                        </button>
                                        <div className="flex-1 text-center">
                                            <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                                                {weeklyQuota}
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">horas</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setWeeklyQuota(Math.min(168, weeklyQuota + 1))}
                                            className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center 
                               text-xl font-bold text-gray-600 dark:text-gray-300 active:bg-gray-200 
                               dark:active:bg-gray-600 transition-colors touch-manipulation"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Status Toggle */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Estado
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setStatus('active')}
                                            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium 
                               transition-all touch-manipulation ${status === 'active'
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                }`}
                                        >
                                            <Check className="w-4 h-4" />
                                            Activo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStatus('delinquent')}
                                            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium 
                               transition-all touch-manipulation ${status === 'delinquent'
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                }`}
                                        >
                                            <AlertTriangle className="w-4 h-4" />
                                            Moroso
                                        </button>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={isPending || !name.trim()}
                                    className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-semibold 
                           rounded-xl transition-all flex items-center justify-center gap-2 
                           disabled:opacity-50 touch-manipulation active:scale-[0.98] mt-6"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            {editingUnit ? 'Guardando...' : 'Creando...'}
                                        </>
                                    ) : (
                                        <>
                                            {editingUnit ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                            {editingUnit ? 'Guardar Cambios' : 'Crear Unidad'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});
UnitFormSheet.displayName = 'UnitFormSheet';

// Confirmation Dialog
const ConfirmDialog = React.memo(({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    isPending,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isPending: boolean;
}) => (
    <AnimatePresence>
        {isOpen && (
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 z-50"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                   bg-white dark:bg-[#1a2c35] rounded-2xl p-6 z-50 w-[90%] max-w-sm shadow-xl"
                >
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                       font-medium touch-manipulation active:scale-[0.98]"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isPending}
                            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium 
                       touch-manipulation active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Eliminar
                        </button>
                    </div>
                </motion.div>
            </>
        )}
    </AnimatePresence>
));
ConfirmDialog.displayName = 'ConfirmDialog';

export default function UnitsPageClient({ initialUnits, condominiumId }: UnitsPageClientProps) {
    const [isPending, startTransition] = useTransition();
    const [searchQuery, setSearchQuery] = useState('');
    const [showFormSheet, setShowFormSheet] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Filter units
    const filteredUnits = useMemo(() =>
        initialUnits.filter((unit) =>
            unit.name.toLowerCase().includes(searchQuery.toLowerCase())
        ), [initialUnits, searchQuery]);

    const showToast = useCallback((message: string, isError = false) => {
        if (isError) {
            setErrorMessage(message);
            setTimeout(() => setErrorMessage(null), 5000);
        } else {
            setSuccessMessage(message);
            if ('vibrate' in navigator) navigator.vibrate([50, 50, 50]);
            setTimeout(() => setSuccessMessage(null), 3000);
        }
    }, []);

    const handleOpenCreate = useCallback(() => {
        setEditingUnit(null);
        setShowFormSheet(true);
    }, []);

    const handleOpenEdit = useCallback((unit: Unit) => {
        setEditingUnit(unit);
        setShowFormSheet(true);
    }, []);

    const handleSubmit = useCallback((name: string, weeklyQuota: number, status: 'active' | 'delinquent') => {
        startTransition(async () => {
            if (editingUnit) {
                const result = await updateUnit(editingUnit.id, { name, weeklyQuotaHours: weeklyQuota, status });
                if (result.success) {
                    showToast('Unidad actualizada');
                    setShowFormSheet(false);
                    setEditingUnit(null);
                } else {
                    showToast(result.error || 'Error al actualizar', true);
                }
            } else {
                const result = await createUnit({ name, weeklyQuotaHours: weeklyQuota, condominiumId });
                if (result.success) {
                    showToast('Unidad creada');
                    setShowFormSheet(false);
                } else {
                    showToast(result.error || 'Error al crear', true);
                }
            }
        });
    }, [editingUnit, condominiumId, showToast]);

    const handleDelete = useCallback(() => {
        if (!deletingUnit) return;
        startTransition(async () => {
            const result = await deleteUnit(deletingUnit.id);
            if (result.success) {
                showToast('Unidad eliminada');
                setDeletingUnit(null);
            } else {
                showToast(result.error || 'Error al eliminar', true);
            }
        });
    }, [deletingUnit, showToast]);

    return (
        <main className="flex-1 flex flex-col w-full overflow-hidden">
            {/* Toast Messages */}
            <AnimatePresence>
                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50"
                    >
                        <div className="bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
                            <Check className="w-5 h-5" />
                            <span className="font-medium">{successMessage}</span>
                        </div>
                    </motion.div>
                )}
                {errorMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50"
                    >
                        <div className="bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
                            <X className="w-5 h-5" />
                            <span className="font-medium">{errorMessage}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
                <div className="px-4 py-3 sm:px-6 sm:py-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                                    Unidades
                                </h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {initialUnits.length} registradas
                                </p>
                            </div>
                            <button
                                onClick={handleOpenCreate}
                                className="w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-xl bg-primary text-white 
                         flex items-center justify-center gap-2 touch-manipulation active:scale-95"
                                aria-label="Crear unidad"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="hidden sm:inline font-medium">Nueva</span>
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="search"
                                placeholder="Buscar unidad..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base
                         focus:ring-2 focus:ring-primary focus:border-transparent touch-manipulation"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-y-contain">
                <div className="px-4 py-4 sm:px-6">
                    <div className="max-w-4xl mx-auto space-y-3">
                        {filteredUnits.length === 0 ? (
                            <div className="text-center py-12">
                                <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">
                                    {searchQuery ? 'No se encontraron unidades' : 'No hay unidades registradas'}
                                </p>
                                {!searchQuery && (
                                    <button
                                        onClick={handleOpenCreate}
                                        className="mt-4 px-4 py-2 text-primary font-medium touch-manipulation"
                                    >
                                        + Crear primera unidad
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredUnits.map((unit) => (
                                <UnitCard
                                    key={unit.id}
                                    unit={unit}
                                    onEdit={() => handleOpenEdit(unit)}
                                    onDelete={() => setDeletingUnit(unit)}
                                    isPending={isPending}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Create/Edit Sheet */}
            <UnitFormSheet
                isOpen={showFormSheet}
                onClose={() => { setShowFormSheet(false); setEditingUnit(null); }}
                onSubmit={handleSubmit}
                isPending={isPending}
                editingUnit={editingUnit}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deletingUnit}
                onClose={() => setDeletingUnit(null)}
                onConfirm={handleDelete}
                title="¿Eliminar unidad?"
                message={`Esta acción eliminará "${deletingUnit?.name}" y no se puede deshacer. Los usuarios asignados quedarán sin unidad.`}
                isPending={isPending}
            />
        </main>
    );
}
