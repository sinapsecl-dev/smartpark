'use client';

import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { setDeveloperCondominium } from '@/app/lib/developer-actions';
import { Building, ChevronDown, Check } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';

interface Condominium {
    id: string;
    name: string;
}

export default function CondominiumSwitcher({ currentCondominiumId }: { currentCondominiumId: string | null }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [condominiums, setCondominiums] = useState<Condominium[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const fetchCondos = async () => {
            const { data } = await supabase
                .from('condominiums')
                .select('id, name')
                .order('name');
            if (data) setCondominiums(data);
        };
        fetchCondos();
    }, [supabase]);

    const handleSwitch = async (id: string) => {
        setIsLoading(true);
        try {
            await setDeveloperCondominium(id);
            setIsOpen(false);
            router.refresh();
        } catch (error) {
            console.error('Error switching condominium:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const currentName = condominiums.find(c => c.id === currentCondominiumId)?.name || 'Seleccionar Condominio';

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
            >
                <Building className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300 max-w-[150px] truncate">
                    {currentName}
                </span>
                <ChevronDown className="w-3 h-3 text-purple-400" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <m.div
                            initial={{ opacity: 0, y: 5, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#1a2c35] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden"
                        >
                            <div className="p-2 max-h-64 overflow-y-auto">
                                <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Cambiar Contexto
                                </p>
                                {condominiums.map(condo => (
                                    <button
                                        key={condo.id}
                                        onClick={() => handleSwitch(condo.id)}
                                        disabled={isLoading}
                                        className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between group"
                                    >
                                        <span className={condo.id === currentCondominiumId ? 'text-purple-600 font-medium' : 'text-gray-600 dark:text-gray-300'}>
                                            {condo.name}
                                        </span>
                                        {condo.id === currentCondominiumId && (
                                            <Check className="w-4 h-4 text-purple-600" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </m.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
