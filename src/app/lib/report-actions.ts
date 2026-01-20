'use server';

import { createServerComponentClient } from '@/lib/supabase/server';
import { TablesInsert } from '@/types/supabase';
import { revalidatePath } from 'next/cache';

export async function createInfractionReport(formData: FormData) {
  const supabase = await createServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'User not authenticated.' };
  }

  // Fetch the user's profile to get role and condominium_id
  const { data: userProfile, error: profileError } = await (supabase
    .from('users') as any) // Cast to any here
    .select('id, role, condominium_id')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile || userProfile.role !== 'resident') {
    console.error('Error fetching user profile or user is not a resident:', profileError);
    return { success: false, message: 'Only residents can report infractions.' };
  }

  const condominiumId = userProfile.condominium_id;

  if (!condominiumId) {
    return { success: false, message: 'Usuario no asignado a un condominio.' };
  }

  const bookingId = formData.get('booking_id') as string;
  const reportType = formData.get('report_type') as TablesInsert<'infractions'>['report_type'];
  const description = formData.get('description') as string;

  if (!bookingId || !reportType) {
    return { success: false, message: 'Missing required report information.' };
  }

  const newInfraction: TablesInsert<'infractions'> = {
    booking_id: bookingId,
    reporter_user_id: user.id,
    condominium_id: condominiumId,
    report_type: reportType,
    description: description || null,
    status: 'pending', // Default status for new reports
  };

  const { error } = await supabase.from('infractions').insert([newInfraction] as any);

  if (error) {
    console.error('Error creating infraction report:', error);
    return { success: false, message: 'Failed to create report: ' + error.message };
  }

  revalidatePath('/dashboard'); // Revalidate dashboard or admin panel
  revalidatePath('/admin'); // Assuming admin also sees reports

  return { success: true, message: 'Infraction report created successfully!' };
}

// TODO: Add server actions for admin to resolve infractions, e.g., liberateSpot
