'use client';

import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger',
    isLoading = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    const colors = {
        danger: {
            iconBg: 'bg-red-100 dark:bg-red-900/20',
            iconColor: 'text-red-600 dark:text-red-500',
            button: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30'
        },
        warning: {
            iconBg: 'bg-amber-100 dark:bg-amber-900/20',
            iconColor: 'text-amber-600 dark:text-amber-500',
            button: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/30'
        },
        info: {
            iconBg: 'bg-blue-100 dark:bg-blue-900/20',
            iconColor: 'text-blue-600 dark:text-blue-500',
            button: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
        }
    };

    const styles = colors[variant];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={!isLoading ? onClose : undefined}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />

                {/* Modal */}
                <m.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative bg-white dark:bg-[#1a2c35] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700"
                >
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="absolute right-4 top-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${styles.iconBg}`}>
                                <AlertCircle className={`w-6 h-6 ${styles.iconColor}`} />
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {title}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                {description}
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={isLoading}
                                    className={`flex-1 px-4 py-2 rounded-xl font-medium transition-all transform active:scale-95 flex items-center justify-center gap-2 ${styles.button}`}
                                >
                                    {isLoading && (
                                        <span className="material-symbols-outlined text-[18px] animate-spin">
                                            progress_activity
                                        </span>
                                    )}
                                    {confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                </m.div>
            </div>
        </AnimatePresence>
    );
}
