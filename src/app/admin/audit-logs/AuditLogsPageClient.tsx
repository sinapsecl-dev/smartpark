'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    History,
    Search,
    Filter,
    Download,
    ChevronLeft,
    ChevronRight,
    Car,
    LogIn,
    LogOut,
    XCircle,
    Calendar,
    UserPlus,
    UserCheck,
    UserX,
    X,
} from 'lucide-react';

interface AuditLog {
    id: string;
    action: string;
    date: string;
    time: string;
    timestamp: string;
    licensePlate: string | null;
    spotName: string | null;
    unitName: string;
    userName: string;
    gateId: string | null;
    metadata: Record<string, any> | null;
}

interface AuditLogsPageClientProps {
    initialLogs: AuditLog[];
    totalCount: number;
    condominiumId: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; bgColor: string; textColor: string }> = {
    entry: {
        label: 'Entrada',
        icon: <LogIn className="w-4 h-4" />,
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        textColor: 'text-green-700 dark:text-green-400'
    },
    exit: {
        label: 'Salida',
        icon: <LogOut className="w-4 h-4" />,
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-700 dark:text-blue-400'
    },
    booking_created: {
        label: 'Reserva',
        icon: <Calendar className="w-4 h-4" />,
        bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
        textColor: 'text-cyan-700 dark:text-cyan-400'
    },
    booking_cancelled: {
        label: 'Cancelada',
        icon: <XCircle className="w-4 h-4" />,
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-700 dark:text-red-400'
    },
    booking_completed: {
        label: 'Completada',
        icon: <Car className="w-4 h-4" />,
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        textColor: 'text-emerald-700 dark:text-emerald-400'
    },
    check_in: {
        label: 'Check-in',
        icon: <LogIn className="w-4 h-4" />,
        bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
        textColor: 'text-indigo-700 dark:text-indigo-400'
    },
    check_out: {
        label: 'Check-out',
        icon: <LogOut className="w-4 h-4" />,
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        textColor: 'text-purple-700 dark:text-purple-400'
    },
    denied: {
        label: 'Denegado',
        icon: <XCircle className="w-4 h-4" />,
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-700 dark:text-red-400'
    },
    user_created: {
        label: 'Usuario+',
        icon: <UserPlus className="w-4 h-4" />,
        bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
        textColor: 'text-cyan-700 dark:text-cyan-400'
    },
    user_approved: {
        label: 'Aprobado',
        icon: <UserCheck className="w-4 h-4" />,
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        textColor: 'text-green-700 dark:text-green-400'
    },
    user_suspended: {
        label: 'Suspendido',
        icon: <UserX className="w-4 h-4" />,
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        textColor: 'text-orange-700 dark:text-orange-400'
    },
};

const ITEMS_PER_PAGE = 20;

// Mobile-optimized log card
const LogCard = React.memo(({ log, index }: { log: AuditLog; index: number }) => {
    const actionInfo = ACTION_CONFIG[log.action] || {
        label: log.action,
        icon: <History className="w-4 h-4" />,
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        textColor: 'text-gray-700 dark:text-gray-400'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.03, 0.3) }}
            className="bg-white dark:bg-[#1a2c35] rounded-xl p-4 border border-gray-100 dark:border-gray-700"
        >
            <div className="flex items-start gap-3">
                {/* Action Icon */}
                <div className={`w-10 h-10 rounded-xl ${actionInfo.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <div className={actionInfo.textColor}>{actionInfo.icon}</div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-sm font-semibold ${actionInfo.textColor}`}>
                            {actionInfo.label}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                            {log.time}
                        </span>
                    </div>

                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {log.unitName}
                    </p>

                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {log.userName}
                    </p>

                    {/* Details Row */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {log.licensePlate && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 
                             text-xs font-mono text-gray-700 dark:text-gray-300">
                                {log.licensePlate}
                            </span>
                        )}
                        {log.spotName && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                📍 {log.spotName}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
});
LogCard.displayName = 'LogCard';

// Filter chip component
const FilterChip = React.memo(({
    label,
    active,
    onClick
}: {
    label: string;
    active: boolean;
    onClick: () => void
}) => (
    <button
        onClick={onClick}
        className={`px-3 py-2 rounded-full text-sm font-medium transition-all touch-manipulation 
               active:scale-95 whitespace-nowrap ${active
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
    >
        {label}
    </button>
));
FilterChip.displayName = 'FilterChip';

export default function AuditLogsPageClient({ initialLogs }: AuditLogsPageClientProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAction, setSelectedAction] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);

    // Filter logs based on search and action filter
    const filteredLogs = useMemo(() => {
        return initialLogs.filter((log) => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                searchQuery === '' ||
                log.licensePlate?.toLowerCase().includes(searchLower) ||
                log.unitName.toLowerCase().includes(searchLower) ||
                log.userName.toLowerCase().includes(searchLower) ||
                log.spotName?.toLowerCase().includes(searchLower);

            const matchesAction = selectedAction === 'all' || log.action === selectedAction;

            return matchesSearch && matchesAction;
        });
    }, [initialLogs, searchQuery, selectedAction]);

    // Paginate
    const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
    const paginatedLogs = useMemo(() =>
        filteredLogs.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        ), [filteredLogs, currentPage]);

    const handleExportCSV = useCallback(() => {
        const headers = ['Fecha', 'Hora', 'Acción', 'Unidad', 'Usuario', 'Patente', 'Estacionamiento'];
        const rows = filteredLogs.map((log) => [
            log.date,
            log.time,
            ACTION_CONFIG[log.action]?.label || log.action,
            log.unitName,
            log.userName,
            log.licensePlate || '-',
            log.spotName || '-',
        ]);

        const csvContent = [headers, ...rows]
            .map((row) => row.map((cell) => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
        link.click();

        if ('vibrate' in navigator) navigator.vibrate(50);
    }, [filteredLogs]);

    const clearFilters = useCallback(() => {
        setSearchQuery('');
        setSelectedAction('all');
        setCurrentPage(1);
    }, []);

    const hasActiveFilters = searchQuery !== '' || selectedAction !== 'all';

    return (
        <main className="flex-1 flex flex-col w-full overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
                <div className="px-4 py-3 sm:px-6 sm:py-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <History className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                                    Auditoría
                                </h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {filteredLogs.length} registros
                                </p>
                            </div>
                            <button
                                onClick={handleExportCSV}
                                className="w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-xl bg-primary text-white 
                         flex items-center justify-center gap-2 touch-manipulation active:scale-95"
                                aria-label="Exportar"
                            >
                                <Download className="w-5 h-5" />
                                <span className="hidden sm:inline font-medium">Exportar</span>
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="search"
                                    placeholder="Buscar..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base
                           focus:ring-2 focus:ring-primary focus:border-transparent transition-all touch-manipulation"
                                />
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`w-12 h-12 rounded-xl flex items-center justify-center touch-manipulation 
                          active:scale-95 transition-colors ${showFilters || hasActiveFilters
                                        ? 'bg-primary text-white'
                                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                                    }`}
                                aria-label="Filtros"
                            >
                                <Filter className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter Panel */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-gray-100 dark:border-gray-700"
                        >
                            <div className="px-4 py-3 sm:px-6 bg-white/50 dark:bg-gray-800/50">
                                <div className="max-w-4xl mx-auto">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Tipo de acción
                                        </p>
                                        {hasActiveFilters && (
                                            <button
                                                onClick={clearFilters}
                                                className="text-xs text-primary font-medium flex items-center gap-1 touch-manipulation"
                                            >
                                                <X className="w-3 h-3" />
                                                Limpiar
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
                                        <FilterChip
                                            label="Todos"
                                            active={selectedAction === 'all'}
                                            onClick={() => { setSelectedAction('all'); setCurrentPage(1); }}
                                        />
                                        {Object.entries(ACTION_CONFIG).map(([key, { label }]) => (
                                            <FilterChip
                                                key={key}
                                                label={label}
                                                active={selectedAction === key}
                                                onClick={() => { setSelectedAction(key); setCurrentPage(1); }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto overscroll-y-contain">
                <div className="px-4 py-4 sm:px-6">
                    <div className="max-w-4xl mx-auto space-y-3">
                        {paginatedLogs.length === 0 ? (
                            <div className="text-center py-12">
                                <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">No se encontraron registros</p>
                            </div>
                        ) : (
                            paginatedLogs.map((log, index) => (
                                <LogCard key={log.id} log={log} index={index} />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Pagination - Fixed at bottom on mobile */}
            {totalPages > 1 && (
                <div className="sticky bottom-0 bg-white/95 dark:bg-[#1a2c35]/95 backdrop-blur-sm 
                       border-t border-gray-100 dark:border-gray-700 px-4 py-3 safe-area-inset-bottom">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center
                       disabled:opacity-40 touch-manipulation active:scale-95 transition-all"
                            aria-label="Página anterior"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {currentPage}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                de {totalPages}
                            </span>
                        </div>

                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center
                       disabled:opacity-40 touch-manipulation active:scale-95 transition-all"
                            aria-label="Siguiente página"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
