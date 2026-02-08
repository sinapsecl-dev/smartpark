'use client';

import React, { useState } from 'react';
import { Tables } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { resolveExtension } from '@/app/lib/extension-actions';
import { Clock, CheckCircle2, XCircle, AlertTriangle, MoreVertical, Calendar } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Booking = Tables<'bookings'> & {
    units?: { name: string | null } | null;
};

interface ExtensionRequestsCardProps {
    requests: Booking[];
}

const ExtensionRequestsCard: React.FC<ExtensionRequestsCardProps> = ({ requests }) => {
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleResolve = async (booking: Booking, hoursToAdd: number) => {
        setProcessingId(booking.id);

        const currentEnd = new Date(booking.end_time);
        // Ensure we extend from NOW if the booking already expired, or from current end if not?
        // Usually extension adds to the scheduled end time.
        // But if it's already overstayed...
        // Let's safe-guard: max(now, end_time) + hours?
        // For simplicity: end_time + hours.

        const newEndTime = new Date(currentEnd.getTime() + hoursToAdd * 60 * 60 * 1000);

        try {
            const result = await resolveExtension(booking.id, newEndTime);
            if (!result.success) {
                alert(result.message);
            }
        } catch (error) {
            console.error(error);
            alert('Error al procesar la extensión');
        } finally {
            setProcessingId(null);
        }
    };

    if (requests.length === 0) return null;

    return (
        <div className="bg-white dark:bg-[#152028] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden col-span-1 md:col-span-2 lg:col-span-3">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <h3 className="font-bold text-[#0d171c] dark:text-white">
                        Solicitudes de Extensión ({requests.length})
                    </h3>
                </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {requests.map((req) => (
                    <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                <Clock className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-[#0d171c] dark:text-white">
                                        {req.units?.name || 'Unidad desconocida'}
                                    </span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono">
                                        {req.license_plate}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                    "{req.extension_reason}"
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                    <Calendar className="w-3 h-3" />
                                    Fin actual: {new Date(req.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                            {processingId === req.id ? (
                                <span className="text-sm text-gray-500 animate-pulse">Procesando...</span>
                            ) : (
                                <>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-9 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                        onClick={() => handleResolve(req, 0)} // 0 hours = just resolve? Or maybe reject? 
                                        // For now, let's treat 0 as "Reject/Clear" which resolveExtension technically doesn't support as "Reject".
                                        // To Implement Reject, we need a separate action or just ignore?
                                        // Let's disable Reject for now, or just implement +1h / +2h buttons.
                                        disabled
                                        title="Rechazar (Próximamente)"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Rechazar
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="sm" className="h-9 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Aprobar
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleResolve(req, 1)}>
                                                +1 Hora
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleResolve(req, 2)}>
                                                +2 Horas
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleResolve(req, 4)}>
                                                +4 Horas
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleResolve(req, 24)}>
                                                +24 Horas
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ExtensionRequestsCard;
