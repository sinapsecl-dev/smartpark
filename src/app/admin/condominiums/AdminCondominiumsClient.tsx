'use client';

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Search, Building2, Power, Trash2, CheckCircle2 } from 'lucide-react';
import { activateCondominium, suspendCondominium, deleteCondominium } from '@/app/lib/developer-actions';
import { useRouter } from 'next/navigation';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface Condominium {
    id: string;
    name: string;
    unique_code: string;
    status: 'active' | 'suspended';
    address: string;
    created_at: string;
}

interface Props {
    initialCondominiums: Condominium[];
}

export default function AdminCondominiumsClient({ initialCondominiums }: Props) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState<string | null>(null);

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'suspend' | 'activate' | 'delete' | null;
        id: string | null;
        name: string | null;
    }>({
        isOpen: false,
        type: null,
        id: null,
        name: null
    });

    const filteredCondos = initialCondominiums.filter(condo =>
        condo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        condo.unique_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openModal = (type: 'suspend' | 'activate' | 'delete', id: string, name: string) => {
        setModalConfig({ isOpen: true, type, id, name });
    };

    const closeModal = () => {
        setModalConfig({ ...modalConfig, isOpen: false });
    };

    const handleConfirm = async () => {
        if (!modalConfig.id || !modalConfig.type) return;

        const id = modalConfig.id;
        setIsLoading(id);

        try {
            if (modalConfig.type === 'suspend') {
                await suspendCondominium(id);
            } else if (modalConfig.type === 'activate') {
                await activateCondominium(id);
            } else if (modalConfig.type === 'delete') {
                await deleteCondominium(id);
            }
            router.refresh();
            closeModal();
        } catch (error) {
            alert('Error al realizar la acción');
        } finally {
            setIsLoading(null);
        }
    };

    const getModalProps = () => {
        switch (modalConfig.type) {
            case 'suspend':
                return {
                    title: `¿Suspender ${modalConfig.name}?`,
                    description: 'Esta acción bloqueará el acceso a todos los residentes y cancelará las reservas activas. ¿Deseas continuar?',
                    confirmText: 'Suspender Condominio',
                    variant: 'warning' as const
                };
            case 'activate':
                return {
                    title: `¿Activar ${modalConfig.name}?`,
                    description: 'El condominio volverá a estar operativo y los residentes podrán ingresar nuevamente.',
                    confirmText: 'Activar Condominio',
                    variant: 'info' as const
                };
            case 'delete':
                return {
                    title: `¿Eliminar ${modalConfig.name}?`,
                    description: '¡CUIDADO! Esta acción es irreversible. Se eliminarán permanentemente todos los datos, usuarios, unidades y reservas asociados.',
                    confirmText: 'Eliminar Definitivamente',
                    variant: 'danger' as const
                };
            default:
                return { title: '', description: '', confirmText: '', variant: 'text' as const };
        }
    };

    const modalProps = getModalProps();

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar condominios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCondos.map((condo) => (
                    <m.div
                        key={condo.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-white dark:bg-[#1a2c35] rounded-xl border shadow-sm p-6 relative overflow-hidden ${condo.status === 'suspended' ? 'border-red-200 dark:border-red-900/50' : 'border-gray-100 dark:border-gray-800'
                            }`}
                    >
                        {/* Status Badge */}
                        <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-semibold uppercase ${condo.status === 'suspended'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                            {condo.status === 'suspended' ? 'Suspendido' : 'Activo'}
                        </div>

                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-6 h-6 text-gray-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{condo.name}</h3>
                                <p className="text-sm text-gray-500 font-mono mt-1">{condo.unique_code}</p>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
                            <p className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">location_on</span>
                                {condo.address || 'Sin dirección'}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => openModal(condo.status === 'active' ? 'suspend' : 'activate', condo.id, condo.name)}
                                disabled={isLoading === condo.id}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${condo.status === 'active'
                                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400'
                                    : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                                    }`}
                            >
                                {condo.status === 'active' ? (
                                    <>
                                        <Power className="w-4 h-4" />
                                        Suspender
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Activar
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => openModal('delete', condo.id, condo.name)}
                                disabled={isLoading === condo.id}
                                className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Eliminar Condominio"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </m.div>
                ))}
            </div>

            {filteredCondos.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No se encontraron condominios.</p>
                </div>
            )}

            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={closeModal}
                onConfirm={handleConfirm}
                title={modalProps.title}
                description={modalProps.description}
                confirmText={modalProps.confirmText}
                variant={modalProps.variant as "info" | "warning" | "danger" | undefined}
                isLoading={!!isLoading}
            />
        </div>
    );
}
