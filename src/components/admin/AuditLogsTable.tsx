'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface AuditLogEntry {
    id: string;
    date: string;
    time: string;
    licensePlate: string;
    action: 'entry' | 'exit' | 'denied' | 'booking';
    unitName: string;
    gateId?: string;
}

interface AuditLogsTableProps {
    logs: AuditLogEntry[];
    totalResults: number;
    currentPage: number;
    onPageChange: (page: number) => void;
    onSearch?: (query: string) => void;
    onFilter?: () => void;
    onExport?: () => void;
    isLoading?: boolean;
}

const actionStyles = {
    entry: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
        icon: null,
        label: 'Entrada',
    },
    exit: {
        bg: 'bg-gray-100 dark:bg-gray-700',
        text: 'text-gray-700 dark:text-gray-300',
        border: 'border-gray-200 dark:border-gray-600',
        icon: null,
        label: 'Salida',
    },
    denied: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800',
        icon: 'block',
        label: 'Denegado',
    },
    booking: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        icon: 'event',
        label: 'Reserva',
    },
};

const AuditLogsTable: React.FC<AuditLogsTableProps> = ({
    logs,
    totalResults,
    currentPage,
    onPageChange,
    onSearch,
    onFilter,
    onExport,
    isLoading = false,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const resultsPerPage = 5;
    const totalPages = Math.ceil(totalResults / resultsPerPage);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        onSearch?.(e.target.value);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col rounded-xl bg-white dark:bg-[#1a2c35] shadow-sm border border-gray-100 dark:border-gray-700"
        >
            {/* Encabezado */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="material-symbols-outlined text-primary">table_view</span>
                    <h2 className="text-[#0d171c] dark:text-white text-lg font-bold leading-tight">
                        Registro de Accesos
                    </h2>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-gray-400 text-[20px]">
                            search
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus:ring-primary focus:border-primary"
                            placeholder="Buscar patente..."
                        />
                    </div>
                    <button
                        onClick={onFilter}
                        className="p-2 text-gray-500 hover:text-primary rounded-lg border border-gray-200 dark:border-gray-600 hover:border-primary bg-white dark:bg-gray-800 transition-colors"
                        title="Filtrar"
                    >
                        <span className="material-symbols-outlined text-[20px]">filter_list</span>
                    </button>
                    <button
                        onClick={onExport}
                        className="p-2 text-gray-500 hover:text-primary rounded-lg border border-gray-200 dark:border-gray-600 hover:border-primary bg-white dark:bg-gray-800 transition-colors"
                        title="Exportar"
                    >
                        <span className="material-symbols-outlined text-[20px]">download</span>
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-gray-800/50 text-xs uppercase text-gray-500 font-semibold border-b border-gray-100 dark:border-gray-700">
                            <th className="px-6 py-4">Fecha y Hora</th>
                            <th className="px-6 py-4">Patente</th>
                            <th className="px-6 py-4">Acción</th>
                            <th className="px-6 py-4">Unidad</th>
                            <th className="px-6 py-4">Portón</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" /></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" /></td>
                                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16" /></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" /></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" /></td>
                                </tr>
                            ))
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No se encontraron registros
                                </td>
                            </tr>
                        ) : (
                            logs.map((log, index) => {
                                const style = actionStyles[log.action];
                                return (
                                    <motion.tr
                                        key={log.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                                    >
                                        <td className="px-6 py-4 text-[#0d171c] dark:text-gray-300">
                                            {log.date}, {log.time}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-[#0d171c] dark:text-white">
                                            {log.licensePlate}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={clsx(
                                                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                                                    style.bg,
                                                    style.text,
                                                    style.border
                                                )}
                                            >
                                                {style.icon ? (
                                                    <span className="material-symbols-outlined text-[12px] leading-none">
                                                        {style.icon}
                                                    </span>
                                                ) : (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                )}
                                                {style.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[#0d171c] dark:text-gray-300">{log.unitName}</td>
                                        <td className="px-6 py-4 text-gray-500">{log.gateId || '-'}</td>
                                    </motion.tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    Mostrando {totalResults > 0 ? (currentPage - 1) * resultsPerPage + 1 : 0}-{Math.min(currentPage * resultsPerPage, totalResults)} de {totalResults.toLocaleString('es-CL')} resultados
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center justify-center w-8 h-8 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>
                    {[...Array(Math.min(3, totalPages || 1))].map((_, i) => (
                        <button
                            key={i + 1}
                            onClick={() => onPageChange(i + 1)}
                            className={clsx(
                                'flex items-center justify-center w-8 h-8 rounded text-sm font-medium transition-colors',
                                currentPage === i + 1
                                    ? 'bg-primary text-white'
                                    : 'border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            )}
                        >
                            {i + 1}
                        </button>
                    ))}
                    {totalPages > 3 && (
                        <>
                            <span className="text-gray-400">...</span>
                            <button
                                onClick={() => onPageChange(totalPages)}
                                className="flex items-center justify-center w-8 h-8 rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
                            >
                                {totalPages}
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="flex items-center justify-center w-8 h-8 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default AuditLogsTable;
