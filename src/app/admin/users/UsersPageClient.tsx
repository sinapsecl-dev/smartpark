'use client';

import React, { useState, useTransition, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    UserPlus,
    Search,
    Mail,
    Phone,
    Home,
    Check,
    X,
    Loader2,
    Clock,
    Shield,
    ChevronRight,
    Ban,
    UserCheck,
    AlertTriangle,
} from 'lucide-react';
import { createUser, approveRegistration, rejectRegistration, updateUserStatus, approveSelfRegistration, rejectSelfRegistration } from './actions';

interface User {
    id: string;
    email: string;
    fullName: string | null;
    phone: string | null;
    role: 'resident' | 'admin';
    userType: 'owner' | 'tenant' | null;
    status: 'pending' | 'active' | 'suspended';
    unitId: string | null;
    unitName: string | null;
    profileCompleted: boolean;
    createdAt: string;
}

interface PendingInvitedUser extends User {
    // Invited by admin, waiting for them to accept invitation
}

interface SelfRegisteredPending {
    id: string;
    email: string;
    fullName: string | null;
    phone: string | null;
    createdAt: string;
}

interface UsersPageClientProps {
    initialUsers: User[];
    pendingInvitedUsers: PendingInvitedUser[];
    selfRegisteredPending: SelfRegisteredPending[];
    availableUnits: { id: string; name: string }[];
    condominiumId: string;
}

const STATUS_CONFIG = {
    active: { label: 'Activo', bgColor: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-700 dark:text-green-400', dotColor: 'bg-green-500' },
    pending: { label: 'Pendiente', bgColor: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-700 dark:text-amber-400', dotColor: 'bg-amber-500' },
    suspended: { label: 'Suspendido', bgColor: 'bg-red-100 dark:bg-red-900/30', textColor: 'text-red-700 dark:text-red-400', dotColor: 'bg-red-500' },
};

type StatusFilter = 'all' | 'active' | 'suspended';

// Confirmation Dialog Component
const ConfirmDialog = React.memo(({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    confirmVariant,
    isPending,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText: string;
    confirmVariant: 'danger' | 'success';
    isPending: boolean;
}) => (
    <AnimatePresence>
        {isOpen && (
            <>
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 z-50"
                />

                {/* Dialog */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 
                     w-[90vw] max-w-md bg-white dark:bg-[#1a2c35] rounded-2xl shadow-2xl p-6"
                >
                    <div className="flex items-start gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                            ${confirmVariant === 'danger' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                            {confirmVariant === 'danger' ? (
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            ) : (
                                <UserCheck className="w-6 h-6 text-green-600" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={onClose}
                            disabled={isPending}
                            className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                             font-medium touch-manipulation active:scale-[0.98] disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isPending}
                            className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2
                             touch-manipulation active:scale-[0.98] disabled:opacity-50
                             ${confirmVariant === 'danger'
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-green-600 hover:bg-green-700 text-white'}`}
                        >
                            {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : confirmVariant === 'danger' ? (
                                <Ban className="w-4 h-4" />
                            ) : (
                                <UserCheck className="w-4 h-4" />
                            )}
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </>
        )}
    </AnimatePresence>
));
ConfirmDialog.displayName = 'ConfirmDialog';

// Improved UserCard with explicit action buttons
const UserCard = React.memo(({
    user,
    onSuspend,
    onReactivate,
    isProcessing
}: {
    user: User;
    onSuspend: () => void;
    onReactivate: () => void;
    isProcessing: boolean;
}) => {
    const status = STATUS_CONFIG[user.status];
    const isSuspended = user.status === 'suspended';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-[#1a2c35] rounded-xl p-4 border transition-all
                ${isSuspended
                    ? 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10'
                    : 'border-gray-100 dark:border-gray-700'}`}
        >
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                    ${isSuspended ? 'bg-red-100 dark:bg-red-900/30' : 'bg-primary/10'}`}>
                    {user.role === 'admin' ? (
                        <Shield className={`w-5 h-5 ${isSuspended ? 'text-red-500' : 'text-primary'}`} />
                    ) : (
                        <span className={`font-bold text-lg ${isSuspended ? 'text-red-500' : 'text-primary'}`}>
                            {user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className={`font-semibold truncate ${isSuspended ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                                {user.fullName || 'Sin nombre'}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{user.email}</span>
                            </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 flex-shrink-0 ${status.bgColor} ${status.textColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                            {status.label}
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {user.unitName && (
                            <span className="flex items-center gap-1">
                                <Home className="w-3 h-3" />
                                {user.unitName}
                            </span>
                        )}
                        {user.phone && (
                            <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {user.phone}
                            </span>
                        )}
                        <span className="text-gray-400 dark:text-gray-500">
                            {user.role === 'admin' ? 'Admin' : user.userType === 'owner' ? 'Propietario' : 'Arrendatario'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Action Button - Explicit */}
            {user.role !== 'admin' && (
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    {isSuspended ? (
                        <button
                            onClick={onReactivate}
                            disabled={isProcessing}
                            className="w-full py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400
                             font-medium text-sm flex items-center justify-center gap-2 
                             hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors
                             touch-manipulation active:scale-[0.98] disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                            Reactivar Usuario
                        </button>
                    ) : (
                        <button
                            onClick={onSuspend}
                            disabled={isProcessing}
                            className="w-full py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400
                             font-medium text-sm flex items-center justify-center gap-2 
                             hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400
                             transition-colors touch-manipulation active:scale-[0.98] disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                            Suspender Usuario
                        </button>
                    )}
                </div>
            )}
        </motion.div>
    );
});
UserCard.displayName = 'UserCard';

// Self-registered pending user card
const SelfRegisteredCard = React.memo(({
    user,
    onApprove,
    onReject,
    isPending
}: {
    user: SelfRegisteredPending;
    onApprove: () => void;
    onReject: () => void;
    isPending: boolean;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#1a2c35] rounded-xl p-4 border border-amber-200 dark:border-amber-800/50"
    >
        <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {user.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Auto-registro
                </p>
            </div>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Solicitado el {new Date(user.createdAt).toLocaleDateString('es-CL', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            })}
        </div>

        <div className="flex gap-2">
            <button
                onClick={onApprove}
                disabled={isPending}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium 
                 flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98]
                 disabled:opacity-50"
            >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Aprobar
            </button>
            <button
                onClick={onReject}
                disabled={isPending}
                className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                 font-medium flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98]
                 disabled:opacity-50"
            >
                <X className="w-4 h-4" />
                Rechazar
            </button>
        </div>
    </motion.div>
));
SelfRegisteredCard.displayName = 'SelfRegisteredCard';

// Bottom Sheet Modal for Create User
const CreateUserSheet = React.memo(({
    isOpen,
    onClose,
    availableUnits,
    onSubmit,
    isPending,
}: {
    isOpen: boolean;
    onClose: () => void;
    availableUnits: { id: string; name: string }[];
    onSubmit: (formData: FormData) => void;
    isPending: boolean;
}) => {
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [unitId, setUnitId] = useState('');
    const [userType, setUserType] = useState<'owner' | 'tenant'>('tenant');

    const handleSubmit = () => {
        if (email && unitId && fullName && userType) {
            const formData = new FormData();
            formData.append('email', email);
            formData.append('fullName', fullName);
            formData.append('unitId', unitId);
            formData.append('userType', userType);
            onSubmit(formData);
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
                                    <UserPlus className="w-5 h-5 text-primary" />
                                    Crear Usuario
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center touch-manipulation"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                El usuario recibirá un email para completar su registro.
                            </p>

                            {/* Form */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nombre Completo
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Juan Pérez"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                                                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base
                                                  focus:ring-2 focus:ring-primary focus:border-transparent touch-manipulation"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Correo Electrónico
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="residente@email.com"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base
                             focus:ring-2 focus:ring-primary focus:border-transparent touch-manipulation"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Unidad
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={unitId}
                                            onChange={(e) => setUnitId(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base
                               focus:ring-2 focus:ring-primary focus:border-transparent appearance-none touch-manipulation"
                                        >
                                            <option value="">Seleccionar unidad...</option>
                                            {availableUnits.map((unit) => (
                                                <option key={unit.id} value={unit.id}>
                                                    {unit.name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rotate-90 pointer-events-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tipo de Usuario
                                    </label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setUserType('tenant')}
                                            className={`flex-1 py-2.5 rounded-xl border font-medium text-sm transition-all
                                                ${userType === 'tenant'
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}
                                        >
                                            Arrendatario
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setUserType('owner')}
                                            className={`flex-1 py-2.5 rounded-xl border font-medium text-sm transition-all
                                                ${userType === 'owner'
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}
                                        >
                                            Propietario
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={isPending || !email || !unitId || !fullName}
                                    className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-semibold 
                           rounded-xl transition-all flex items-center justify-center gap-2 
                           disabled:opacity-50 touch-manipulation active:scale-[0.98] mt-6"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Creando...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-5 h-5" />
                                            Crear y Enviar Invitación
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
CreateUserSheet.displayName = 'CreateUserSheet';

// Status Filter Pills Component
const StatusFilterPills = React.memo(({
    activeFilter,
    onFilterChange,
    counts,
}: {
    activeFilter: StatusFilter;
    onFilterChange: (filter: StatusFilter) => void;
    counts: { all: number; active: number; suspended: number };
}) => (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        <button
            onClick={() => onFilterChange('all')}
            className={`px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all touch-manipulation
                ${activeFilter === 'all'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
        >
            Todos ({counts.all})
        </button>
        <button
            onClick={() => onFilterChange('active')}
            className={`px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all touch-manipulation flex items-center gap-1.5
                ${activeFilter === 'active'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
        >
            <span className={`w-2 h-2 rounded-full ${activeFilter === 'active' ? 'bg-white' : 'bg-green-500'}`} />
            Activos ({counts.active})
        </button>
        <button
            onClick={() => onFilterChange('suspended')}
            className={`px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all touch-manipulation flex items-center gap-1.5
                ${activeFilter === 'suspended'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
        >
            <span className={`w-2 h-2 rounded-full ${activeFilter === 'suspended' ? 'bg-white' : 'bg-red-500'}`} />
            Suspendidos ({counts.suspended})
        </button>
    </div>
));
StatusFilterPills.displayName = 'StatusFilterPills';

export default function UsersPageClient({
    initialUsers,
    pendingInvitedUsers,
    selfRegisteredPending,
    availableUnits,
}: UsersPageClientProps) {
    const [isPending, startTransition] = useTransition();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'pending' | 'solicitudes'>('users');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [showCreateSheet, setShowCreateSheet] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [processingUserId, setProcessingUserId] = useState<string | null>(null);

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        userId: string;
        userName: string;
        unitName: string;
        action: 'suspend' | 'reactivate';
    }>({ isOpen: false, userId: '', userName: '', unitName: '', action: 'suspend' });

    // Status counts
    const statusCounts = useMemo(() => ({
        all: initialUsers.length,
        active: initialUsers.filter(u => u.status === 'active').length,
        suspended: initialUsers.filter(u => u.status === 'suspended').length,
    }), [initialUsers]);

    // Filter users by search and status
    const filteredUsers = useMemo(() =>
        initialUsers.filter((user) => {
            const matchesSearch =
                user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.unitName?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

            return matchesSearch && matchesStatus;
        }), [initialUsers, searchQuery, statusFilter]);

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

    const handleCreateUser = useCallback((formData: FormData) => {
        startTransition(async () => {
            const result = await createUser(formData);
            if (result.success) {
                showToast('Usuario creado. Invitación enviada.');
                setShowCreateSheet(false);
            } else {
                showToast(result.error || 'Error al crear usuario', true);
            }
        });
    }, [showToast]);

    const handleApproveRegistration = useCallback((regId: string) => {
        startTransition(async () => {
            const result = await approveRegistration(regId);
            if (result.success) {
                showToast('Registro aprobado');
            } else {
                showToast(result.error || 'Error al aprobar', true);
            }
        });
    }, [showToast]);

    const handleRejectRegistration = useCallback((regId: string) => {
        startTransition(async () => {
            const result = await rejectRegistration(regId);
            if (result.success) {
                showToast('Registro rechazado');
            } else {
                showToast(result.error || 'Error al rechazar', true);
            }
        });
    }, [showToast]);

    // Handlers for self-registered pending users
    const handleApproveSelfRegistered = useCallback((userId: string) => {
        startTransition(async () => {
            const result = await approveSelfRegistration(userId);
            if (result.success) {
                showToast('Usuario aprobado. Recibirá un email de notificación.');
            } else {
                showToast(result.error || 'Error al aprobar', true);
            }
        });
    }, [showToast]);

    const handleRejectSelfRegistered = useCallback((userId: string) => {
        startTransition(async () => {
            const result = await rejectSelfRegistration(userId);
            if (result.success) {
                showToast('Solicitud rechazada');
            } else {
                showToast(result.error || 'Error al rechazar', true);
            }
        });
    }, [showToast]);

    // Open confirmation dialog
    const openConfirmDialog = useCallback((user: User, action: 'suspend' | 'reactivate') => {
        setConfirmDialog({
            isOpen: true,
            userId: user.id,
            userName: user.fullName || user.email,
            unitName: user.unitName || 'Sin unidad',
            action,
        });
    }, []);

    // Handle confirmed action
    const handleConfirmedAction = useCallback(() => {
        const { userId, action } = confirmDialog;
        const newStatus = action === 'suspend' ? 'suspended' : 'active';

        setProcessingUserId(userId);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));

        startTransition(async () => {
            const result = await updateUserStatus(userId, newStatus);
            setProcessingUserId(null);

            if (result.success) {
                showToast(`Usuario ${newStatus === 'active' ? 'reactivado' : 'suspendido'} exitosamente`);
            } else {
                showToast(result.error || 'Error al actualizar', true);
            }
        });
    }, [confirmDialog, showToast]);

    return (
        <main className="flex-1 flex flex-col w-full">
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

            {/* Confirmation Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleConfirmedAction}
                title={confirmDialog.action === 'suspend' ? 'Confirmar Suspensión' : 'Confirmar Reactivación'}
                message={confirmDialog.action === 'suspend'
                    ? `¿Estás seguro de suspender a ${confirmDialog.userName} (${confirmDialog.unitName})? El usuario no podrá hacer reservas mientras esté suspendido.`
                    : `¿Estás seguro de reactivar a ${confirmDialog.userName} (${confirmDialog.unitName})? El usuario podrá volver a hacer reservas.`}
                confirmText={confirmDialog.action === 'suspend' ? 'Suspender' : 'Reactivar'}
                confirmVariant={confirmDialog.action === 'suspend' ? 'danger' : 'success'}
                isPending={isPending}
            />

            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
                <div className="px-4 py-3 sm:px-6 sm:py-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                                    Usuarios
                                </h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {initialUsers.length} registrados · {statusCounts.suspended} suspendidos
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateSheet(true)}
                                className="w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-xl bg-primary text-white 
                         flex items-center justify-center gap-2 touch-manipulation active:scale-95"
                                aria-label="Crear usuario"
                            >
                                <UserPlus className="w-5 h-5" />
                                <span className="hidden sm:inline font-medium">Crear</span>
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all touch-manipulation ${activeTab === 'users'
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400'
                                    }`}
                            >
                                Usuarios ({initialUsers.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('solicitudes')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all touch-manipulation 
                          flex items-center justify-center gap-2 ${activeTab === 'solicitudes'
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400'
                                    }`}
                            >
                                Solicitudes
                                {selfRegisteredPending.length > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold min-w-[1.25rem]">
                                        {selfRegisteredPending.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search and Filters - only for users tab */}
                {activeTab === 'users' && (
                    <div className="px-4 pb-3 sm:px-6 space-y-3">
                        <div className="max-w-4xl mx-auto relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="search"
                                placeholder="Buscar por nombre, email o unidad..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base
                         focus:ring-2 focus:ring-primary focus:border-transparent touch-manipulation"
                            />
                        </div>
                        <div className="max-w-4xl mx-auto">
                            <StatusFilterPills
                                activeFilter={statusFilter}
                                onFilterChange={setStatusFilter}
                                counts={statusCounts}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1">
                <div className="px-4 py-4 sm:px-6">
                    <div className="max-w-4xl mx-auto space-y-3">
                        {activeTab === 'users' ? (
                            filteredUsers.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {searchQuery || statusFilter !== 'all'
                                            ? 'No se encontraron usuarios con estos filtros'
                                            : 'No hay usuarios registrados'}
                                    </p>
                                </div>
                            ) : (
                                filteredUsers.map((user) => (
                                    <UserCard
                                        key={user.id}
                                        user={user}
                                        onSuspend={() => openConfirmDialog(user, 'suspend')}
                                        onReactivate={() => openConfirmDialog(user, 'reactivate')}
                                        isProcessing={processingUserId === user.id}
                                    />
                                ))
                            )
                        ) : activeTab === 'solicitudes' ? (
                            selfRegisteredPending.length === 0 ? (
                                <div className="text-center py-12">
                                    <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400">No hay solicitudes de auto-registro pendientes</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                        Los usuarios que se registren por su cuenta aparecerán aquí para aprobación.
                                    </p>
                                </div>
                            ) : (
                                selfRegisteredPending.map((user) => (
                                    <SelfRegisteredCard
                                        key={user.id}
                                        user={user}
                                        onApprove={() => handleApproveSelfRegistered(user.id)}
                                        onReject={() => handleRejectSelfRegistered(user.id)}
                                        isPending={isPending}
                                    />
                                ))
                            )
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Create User Bottom Sheet */}
            <CreateUserSheet
                isOpen={showCreateSheet}
                onClose={() => setShowCreateSheet(false)}
                availableUnits={availableUnits}
                onSubmit={handleCreateUser}
                isPending={isPending}
            />
        </main>
    );
}
