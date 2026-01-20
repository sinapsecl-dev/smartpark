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
    UserCheck,
    UserX,
    Shield,
    ChevronRight,
    MoreHorizontal,
} from 'lucide-react';
import { createUser, approveRegistration, rejectRegistration, updateUserStatus } from './actions';

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

interface PendingRegistration {
    id: string;
    email: string;
    fullName: string | null;
    phone: string | null;
    requestedUnitName: string | null;
    userType: 'owner' | 'tenant' | null;
    status: string;
    createdAt: string;
}

interface UsersPageClientProps {
    initialUsers: User[];
    pendingRegistrations: PendingRegistration[];
    availableUnits: { id: string; name: string }[];
    condominiumId: string;
}

const STATUS_CONFIG = {
    active: { label: 'Activo', bgColor: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-700 dark:text-green-400' },
    pending: { label: 'Pendiente', bgColor: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-700 dark:text-amber-400' },
    suspended: { label: 'Suspendido', bgColor: 'bg-red-100 dark:bg-red-900/30', textColor: 'text-red-700 dark:text-red-400' },
};

// Mobile-optimized user card
const UserCard = React.memo(({ user, onAction }: { user: User; onAction: (action: string) => void }) => {
    const status = STATUS_CONFIG[user.status];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#1a2c35] rounded-xl p-4 border border-gray-100 dark:border-gray-700"
        >
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {user.role === 'admin' ? (
                        <Shield className="w-5 h-5 text-primary" />
                    ) : (
                        <span className="text-primary font-bold text-lg">
                            {user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                                {user.fullName || 'Sin nombre'}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{user.email}</span>
                            </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${status.bgColor} ${status.textColor}`}>
                            {status.label}
                        </span>
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
                            {user.role === 'admin' ? 'Admin' : user.userType === 'owner' ? 'Dueño' : 'Arrendatario'}
                        </span>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={() => onAction(user.status === 'active' ? 'suspend' : 'activate')}
                    className="w-10 h-10 rounded-xl flex items-center justify-center 
                   bg-gray-50 dark:bg-gray-700 touch-manipulation active:scale-95"
                    aria-label="Más acciones"
                >
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                </button>
            </div>
        </motion.div>
    );
});
UserCard.displayName = 'UserCard';

// Pending registration card
const PendingCard = React.memo(({
    registration,
    onApprove,
    onReject,
    isPending
}: {
    registration: PendingRegistration;
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
                    {registration.fullName || 'Sin nombre'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {registration.email}
                </p>
            </div>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 space-y-1">
            {registration.requestedUnitName && (
                <div className="flex items-center gap-2">
                    <Home className="w-3 h-3 flex-shrink-0" />
                    <span>Solicita: {registration.requestedUnitName}</span>
                </div>
            )}
            <div>
                Solicitado el {new Date(registration.createdAt).toLocaleDateString('es-CL')}
            </div>
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
PendingCard.displayName = 'PendingCard';

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
    onSubmit: (email: string, unitId: string) => void;
    isPending: boolean;
}) => {
    const [email, setEmail] = useState('');
    const [unitId, setUnitId] = useState('');

    const handleSubmit = () => {
        if (email && unitId) {
            onSubmit(email, unitId);
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

                                <button
                                    onClick={handleSubmit}
                                    disabled={isPending || !email || !unitId}
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

export default function UsersPageClient({
    initialUsers,
    pendingRegistrations,
    availableUnits,
}: UsersPageClientProps) {
    const [isPending, startTransition] = useTransition();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'pending'>('users');
    const [showCreateSheet, setShowCreateSheet] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Filter users by search
    const filteredUsers = useMemo(() =>
        initialUsers.filter(
            (user) =>
                user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.unitName?.toLowerCase().includes(searchQuery.toLowerCase())
        ), [initialUsers, searchQuery]);

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

    const handleCreateUser = useCallback((email: string, unitId: string) => {
        startTransition(async () => {
            const result = await createUser(email, unitId);
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

    const handleUserAction = useCallback((userId: string, action: string) => {
        const newStatus = action === 'suspend' ? 'suspended' : 'active';
        startTransition(async () => {
            const result = await updateUserStatus(userId, newStatus as 'active' | 'suspended');
            if (result.success) {
                showToast(`Usuario ${newStatus === 'active' ? 'activado' : 'suspendido'}`);
            } else {
                showToast(result.error || 'Error al actualizar', true);
            }
        });
    }, [showToast]);

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
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                                    Usuarios
                                </h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {initialUsers.length} registrados
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
                                onClick={() => setActiveTab('pending')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all touch-manipulation 
                          flex items-center justify-center gap-2 ${activeTab === 'pending'
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400'
                                    }`}
                            >
                                Pendientes
                                {pendingRegistrations.length > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold min-w-[1.25rem]">
                                        {pendingRegistrations.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search - only for users tab */}
                {activeTab === 'users' && (
                    <div className="px-4 pb-3 sm:px-6">
                        <div className="max-w-4xl mx-auto relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="search"
                                placeholder="Buscar usuario..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base
                         focus:ring-2 focus:ring-primary focus:border-transparent touch-manipulation"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-y-contain">
                <div className="px-4 py-4 sm:px-6">
                    <div className="max-w-4xl mx-auto space-y-3">
                        {activeTab === 'users' ? (
                            filteredUsers.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400">No se encontraron usuarios</p>
                                </div>
                            ) : (
                                filteredUsers.map((user) => (
                                    <UserCard
                                        key={user.id}
                                        user={user}
                                        onAction={(action) => handleUserAction(user.id, action)}
                                    />
                                ))
                            )
                        ) : (
                            pendingRegistrations.length === 0 ? (
                                <div className="text-center py-12">
                                    <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400">No hay solicitudes pendientes</p>
                                </div>
                            ) : (
                                pendingRegistrations.map((reg) => (
                                    <PendingCard
                                        key={reg.id}
                                        registration={reg}
                                        onApprove={() => handleApproveRegistration(reg.id)}
                                        onReject={() => handleRejectRegistration(reg.id)}
                                        isPending={isPending}
                                    />
                                ))
                            )
                        )}
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
