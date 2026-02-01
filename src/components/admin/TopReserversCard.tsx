'use client';

import React from 'react';
import { m } from 'framer-motion';

interface TopReserver {
    rank: number;
    unitName: string;
    reservationCount: number;
}

interface TopReserversCardProps {
    reservers: TopReserver[];
    title?: string;
}

const TopReserversCard: React.FC<TopReserversCardProps> = ({
    reservers,
    title = 'Top Reservas (Este Mes)',
}) => {
    return (
        <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col rounded-xl bg-white dark:bg-[#1a2c35] p-6 shadow-sm border border-gray-100 dark:border-gray-700"
        >
            <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-amber-500">leaderboard</span>
                <p className="text-[#0d171c] dark:text-gray-200 text-base font-semibold">{title}</p>
            </div>

            <div className="flex flex-col gap-3">
                {reservers.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Sin reservas este mes</p>
                ) : (
                    reservers.map((reserver, index) => (
                        <m.div
                            key={reserver.unitName}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-400 w-4">{reserver.rank}</span>
                                <span className="font-bold text-sm dark:text-white">{reserver.unitName}</span>
                            </div>
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {reserver.reservationCount} {reserver.reservationCount === 1 ? 'reserva' : 'reservas'}
                            </span>
                        </m.div>
                    ))
                )}
            </div>
        </m.div>
    );
};

export default TopReserversCard;
