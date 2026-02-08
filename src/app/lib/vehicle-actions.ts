'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';

export type UnitVehicle = Database['public']['Tables']['unit_vehicles']['Row'];
export type CreateVehicleParams = {
    unitId: string;
    licensePlate: string;
    vehicleType?: string;
    isPrimary?: boolean;
};

export async function getUnitVehicles(unitId: string) {
    const supabase = await createServerComponentClient();
    const { data, error } = await supabase
        .from('unit_vehicles')
        .select('*')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching unit vehicles:', error);
        return { success: false, vehicles: [], message: error.message };
    }

    return { success: true, vehicles: data };
}

export async function registerVehicle(params: CreateVehicleParams) {
    const supabase = await createServerComponentClient();
    const user = (await supabase.auth.getUser()).data.user;

    if (!user) {
        return { success: false, message: 'No autorizado' };
    }

    const { unitId, licensePlate, vehicleType, isPrimary } = params;
    const cleanPlate = licensePlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (cleanPlate.length !== 6) {
        return { success: false, message: 'La patente debe tener exactamente 6 caracteres' };
    }

    // Check limit
    // 1. Get unit's condominium max limit
    const { data: unitData, error: unitError } = await (supabase as any)
        .from('units')
        .select(`
            id, 
            condominium:condominiums (
                max_vehicles_per_unit
            )
        `)
        .eq('id', unitId)
        .single();

    if (unitError || !unitData) {
        return { success: false, message: 'No se pudo verificar el límite de vehículos' };
    }

    const maxVehicles = unitData.condominium?.max_vehicles_per_unit || 3;

    // 2. Count current vehicles
    const { count, error: countError } = await supabase
        .from('unit_vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('unit_id', unitId);

    if ((count || 0) >= maxVehicles) {
        return { success: false, message: `Límite de vehículos alcanzado (${maxVehicles})` };
    }

    // Insert
    const { data, error } = await supabase
        .from('unit_vehicles')
        .insert({
            unit_id: unitId,
            license_plate: cleanPlate,
            vehicle_type: vehicleType || 'car',
            is_primary: isPrimary || false,
            created_by: user.id
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') { // Unique violation
            return { success: false, message: 'Esta patente ya está registrada en tu unidad' };
        }
        console.error('Error registering vehicle:', error);
        return { success: false, message: error.message };
    }

    return { success: true, vehicle: data };
}

export async function removeVehicle(vehicleId: string) {
    const supabase = await createServerComponentClient();

    const { error } = await supabase
        .from('unit_vehicles')
        .delete()
        .eq('id', vehicleId);

    if (error) {
        return { success: false, message: error.message };
    }

    return { success: true };
}

export async function isPlateRegisteredInCondominium(plate: string, condominiumId: string) {
    const supabase = await createServerComponentClient();
    const cleanPlate = plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Check if plate exists in any unit of this condominium
    // Join unit_vehicles -> units -> check condominium_id
    const { count, error } = await supabase
        .from('unit_vehicles')
        .select('id, units!inner(condominium_id)', { count: 'exact', head: true })
        .eq('license_plate', cleanPlate)
        .eq('units.condominium_id', condominiumId);

    if (error) {
        console.error('Error checking plate:', error);
        return false; // Default to allow if error? Or fail safe?
        // Better to return false (not registered) to not block if system fails, 
        // OR return true (registered) to block?
        // If checking "Is allowed guest parking?", if registered -> Block.
        // So return false (not registered) means "Allow booking".
    }

    return (count || 0) > 0;
}
