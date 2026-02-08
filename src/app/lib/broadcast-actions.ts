'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { createNotification } from './push-notification-actions';
import { revalidatePath } from 'next/cache';

/**
 * Send a broadcast notification to all users in the admin's condominium.
 */
export async function sendCondoBroadcast(
    title: string,
    body: string
): Promise<{ success: boolean; message: string; count?: number }> {
    try {
        const supabase = await createServerComponentClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, message: 'No autorizado' };
        }

        // Verify admin role and get condominium_id
        const { data: adminProfile } = await supabase
            .from('users')
            .select('role, condominium_id')
            .eq('id', user.id)
            .single();

        if (!adminProfile || adminProfile.role !== 'admin' || !adminProfile.condominium_id) {
            return { success: false, message: 'No tienes permisos de administrador.' };
        }

        const condominiumId = adminProfile.condominium_id;

        // Fetch all active users in the condominium
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id')
            .eq('condominium_id', condominiumId)
            .eq('status', 'active');

        if (usersError || !users || users.length === 0) {
            return { success: false, message: 'No se encontraron usuarios activos en el condominio.' };
        }

        // Send notifications in parallel (ignoring individual failures for the broadcast summary)
        let successCount = 0;
        const promises = users.map(async (targetUser) => {
            const result = await createNotification(
                targetUser.id,
                title,
                body,
                'info',
                { broadcast: true, sender: 'admin' }
            );
            if (result.success) successCount++;
        });

        await Promise.all(promises);

        revalidatePath('/admin/notifications');
        return {
            success: true,
            message: `Notificación enviada a ${successCount} de ${users.length} usuarios.`,
            count: successCount
        };

    } catch (error: any) {
        console.error('Error sending broadcast:', error);
        return { success: false, message: 'Error interno al enviar notificaciones.' };
    }
}
