'use client';

import React, { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Home, ChevronRight, Check, Loader2, Car } from 'lucide-react';
import { completeProfile } from './actions';
import { useRouter } from 'next/navigation';

interface CompleteProfileClientProps {
    userEmail: string;
    userId: string;
    condominiumId: string | null;
    preassignedUnitId: string | null;
    preassignedUnitName: string | null;
    availableUnits: { id: string; name: string }[];
    existingProfile: { id: string; role: string } | null;
}

export default function CompleteProfileClient({
    userEmail,
    userId,
    condominiumId,
    preassignedUnitId,
    preassignedUnitName,
    availableUnits,
    existingProfile,
}: CompleteProfileClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        userType: 'owner' as 'owner' | 'tenant',
        unitId: preassignedUnitId || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.fullName.trim()) {
            setError('Por favor ingresa tu nombre completo');
            return;
        }

        if (!formData.unitId && !preassignedUnitId) {
            setError('Por favor selecciona una unidad');
            return;
        }

        startTransition(async () => {
            const result = await completeProfile({
                userId,
                fullName: formData.fullName.trim(),
                phone: formData.phone.trim() || null,
                userType: formData.userType,
                unitId: formData.unitId || preassignedUnitId!,
                condominiumId: condominiumId!,
            });

            if (result.success) {
                router.push('/dashboard');
            } else {
                setError(result.error || 'Error al completar el perfil');
            }
        });
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Car className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                        ¡Bienvenido a SmartPark!
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Completa tu perfil para comenzar
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white dark:bg-[#1a2c35] rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email (read-only) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Correo Electrónico
                            </label>
                            <input
                                type="email"
                                value={userEmail}
                                disabled
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                         bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                            />
                        </div>

                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Nombre Completo *
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="Tu nombre completo"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-primary focus:border-transparent touch-manipulation"
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Teléfono (opcional)
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+56 9 1234 5678"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-primary focus:border-transparent touch-manipulation"
                                />
                            </div>
                        </div>

                        {/* Unit Selection */}
                        {preassignedUnitName ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Unidad Asignada
                                </label>
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5">
                                    <Home className="w-5 h-5 text-primary" />
                                    <span className="font-medium text-gray-900 dark:text-white">{preassignedUnitName}</span>
                                </div>
                            </div>
                        ) : availableUnits.length > 0 ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Selecciona tu Unidad *
                                </label>
                                <div className="relative">
                                    <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <select
                                        value={formData.unitId}
                                        onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-600 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-primary focus:border-transparent appearance-none touch-manipulation"
                                    >
                                        <option value="">Seleccionar unidad...</option>
                                        {availableUnits.map((unit) => (
                                            <option key={unit.id} value={unit.id}>
                                                {unit.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rotate-90" />
                                </div>
                            </div>
                        ) : null}

                        {/* User Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tipo de Residente
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, userType: 'owner' })}
                                    className={`py-3 rounded-xl font-medium transition-all touch-manipulation ${formData.userType === 'owner'
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    Propietario
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, userType: 'tenant' })}
                                    className={`py-3 rounded-xl font-medium transition-all touch-manipulation ${formData.userType === 'tenant'
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    Arrendatario
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold 
                       rounded-xl transition-all flex items-center justify-center gap-2 
                       disabled:opacity-50 touch-manipulation active:scale-[0.98]"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    Completar Perfil
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </main>
    );
}
