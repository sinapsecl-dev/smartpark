'use client';

import React, { useState, useEffect } from 'react';
import { KPICard, TopReserversCard, FairPlayRulesForm, AuditLogsTable, ExtensionRequestsCard } from '@/components/admin';

interface AdminDashboardClientProps {
    occupancyPercentage: number;
    occupiedSpots: number;
    totalSpots: number;
    zombieVehiclesCount: number;
    topReservers: { rank: number; unitName: string; reservationCount: number }[];
    fairPlayRules: {
        maxReservationDuration: number;
        cooldownPeriod: number;
        weeklyQuotaHours: number;
    };
    auditLogs: {
        id: string;
        date: string;
        time: string;
        licensePlate: string;
        action: 'entry' | 'exit' | 'denied' | 'booking';
        unitName: string;
        gateId?: string;
    }[];
    totalAuditLogs: number;
    pendingRequests: any[];
}

const AdminDashboardClient: React.FC<AdminDashboardClientProps> = ({
    occupancyPercentage,
    occupiedSpots,
    totalSpots,
    zombieVehiclesCount,
    topReservers,
    fairPlayRules,
    auditLogs,
    totalAuditLogs,
    pendingRequests = []
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    // Use state for time to avoid hydration mismatch
    const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);

    // Only set time after hydration on client side
    useEffect(() => {
        setLastUpdatedTime(new Date().toLocaleTimeString('es-CL'));
    }, []);

    const handleSaveRules = async (values: typeof fairPlayRules) => {
        console.log('Guardando reglas:', values);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleSearch = (query: string) => {
        console.log('Buscando:', query);
    };

    const handleViewZombies = () => {
        alert('Ver vehículos zombie');
    };

    return (
        <main className="flex-1 flex flex-col items-center w-full px-4 sm:px-6 lg:px-8 py-8">
            <div className="w-full max-w-7xl flex flex-col gap-8">
                {/* Encabezado de página */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-[#0d171c] dark:text-white text-3xl font-black leading-tight tracking-tight">
                            Panel de Control
                        </h1>
                        <p className="text-[#49829c] dark:text-gray-400 text-base font-normal">
                            Estado del estacionamiento y controles Fair Play en tiempo real.
                        </p>
                    </div>
                    <div className="text-sm text-[#49829c] dark:text-gray-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">update</span>
                        {/* Show placeholder during SSR to avoid hydration mismatch */}
                        Última actualización: {lastUpdatedTime ?? '--:--:--'}
                    </div>
                </div>

                {/* Tarjetas KPI */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Extension Requests (High Priority) */}
                    <ExtensionRequestsCard requests={pendingRequests} />

                    {/* Ocupación actual */}
                    <KPICard
                        title="Ocupación Actual"
                        value={`${occupancyPercentage}%`}
                        subtitle={`${occupiedSpots}/${totalSpots} espacios`}
                        icon="directions_car"
                        iconColorClass="text-primary"
                        badge={{
                            text: '+5% vs última hora',
                            type: 'success',
                        }}
                        progress={occupancyPercentage}
                    />

                    {/* Vehículos Zombie */}
                    <KPICard
                        title="Vehículos Zombie"
                        value={zombieVehiclesCount}
                        subtitle="Más de 24hrs estacionados"
                        icon="warning"
                        iconColorClass="text-red-600"
                        badge={
                            zombieVehiclesCount > 0
                                ? { text: 'Acción Requerida', type: 'danger' }
                                : undefined
                        }
                        variant={zombieVehiclesCount > 0 ? 'alert' : 'default'}
                        actionButton={
                            zombieVehiclesCount > 0
                                ? { label: 'Ver Detalles', onClick: handleViewZombies }
                                : undefined
                        }
                    />

                    {/* Top Reservadores */}
                    <TopReserversCard reservers={topReservers} />
                </div>

                {/* Configuración Fair Play */}
                <FairPlayRulesForm
                    initialValues={fairPlayRules}
                    onSave={handleSaveRules}
                    onViewHistory={() => console.log('Ver historial')}
                />

                {/* Registros de Auditoría */}
                <AuditLogsTable
                    logs={auditLogs}
                    totalResults={totalAuditLogs}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                    onSearch={handleSearch}
                    onFilter={() => console.log('Filtrar')}
                    onExport={() => console.log('Exportar')}
                />
            </div>
        </main>
    );
};

export default AdminDashboardClient;
