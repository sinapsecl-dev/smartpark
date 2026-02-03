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

  // Award XP for reporting a valid issue (initially it's pending, but we might award for "Active Participation" 
  // or only when it's resolved. The plan says "REPORT_VALID_ISSUE". 
  // For now, let's award a small amount for reporting, or wait for resolution?
  // The action is REPORT_VALID_ISSUE. So strictly speaking should be on resolution.
  // But let's check `actions/gamification.ts` -> checkAchievements("REPORT_VALID_ISSUE") checks for "status=resolved".
  // So we should probably NOT award XP here yet, OR we award a smaller amount for participation?
  // Given instructions, let's wait for resolution.
  // HOWEVER, I will add the import to clean up the file and maybe invoke a "REPORT_SUBMITTED" if we had it.
  // Actually, I'll stick to the plan: "REPORT_VALID_ISSUE" -> 40 XP. This implies validation.
  // So I will NOT award XP here.
  // BUT, I should check if there is an action for "Report Solved" or "Infraction Resolved".
  // There isn't. I'll leave this file alone regarding XP for now, OR maybe award a small "submission" XP?
  // No, I'll stick to "REPORT_VALID_ISSUE".

  // Wait! I need to update the imports at the top regardless if I use it.
  // Actually, I'll assume the ADMIN resolves it and triggers the XP award.
  // So I will NOT change this function for XP yet, unless I want to award for just reporting.
  // Let's assume for now 5 XP for reporting? No, better stick to spec.

  revalidatePath('/dashboard'); // Revalidate dashboard or admin panel
  revalidatePath('/admin'); // Assuming admin also sees reports

  return { success: true, message: 'Infraction report created successfully!' };
}

// TODO: Add server actions for admin to resolve infractions, e.g., liberateSpot
