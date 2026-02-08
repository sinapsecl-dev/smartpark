
export type SanctionType = 'fine' | 'debt' | 'fee' | 'other';

export const SANCTION_TYPE_LABELS: Record<SanctionType, { label: string; color: string }> = {
    fine: { label: 'Multa', color: 'red' },
    debt: { label: 'Deuda', color: 'orange' },
    fee: { label: 'Gastos Comunes', color: 'yellow' },
    other: { label: 'Otro', color: 'gray' },
};
