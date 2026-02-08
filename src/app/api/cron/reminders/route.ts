import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification } from '@/app/lib/push-notification-actions';

// Initialize Supabase Admin Client for Cron Job (Server-side only)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

// Helper to calculate time ranges
const getReminderTimeRange = () => {
    // Current time
    const now = new Date();

    // Look for bookings ending in 15-20 minutes
    // This allows the cron to run every 5 mins and catch everything
    const startRange = new Date(now.getTime() + 15 * 60 * 1000); // Now + 15m
    const endRange = new Date(now.getTime() + 20 * 60 * 1000);   // Now + 20m

    return { startRange, endRange };
};

export async function GET(req: NextRequest) {
    // Security check (Verify Vercel Cron Header or Custom Secret)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Return 401 but allow development testing if no secret set (optional, safer to enforce)
        if (process.env.NODE_ENV === 'production') {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }

    const { startRange, endRange } = getReminderTimeRange();

    try {
        // 1. Find target bookings
        // End time is between [Now+15m, Now+20m] AND reminder_sent is false
        const { data: bookings, error } = await supabaseAdmin
            .from('bookings')
            .select(`
                id,
                end_time,
                user_id,
                status,
                users (
                    id,
                    unit_id
                )
            `)
            .eq('status', 'active')
            .eq('reminder_sent', false)
            .gte('end_time', startRange.toISOString())
            .lte('end_time', endRange.toISOString());

        if (error) {
            console.error('Error fetching bookings for reminder:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!bookings || bookings.length === 0) {
            return NextResponse.json({ message: 'No bookings requiring reminders found.' });
        }

        let sentCount = 0;

        // 2. Process each booking
        for (const booking of bookings) {
            const user = booking.users as any; // Typed as array or object depending on query, usually object if FK is correct

            if (!user?.unit_id) {
                console.warn(`Booking ${booking.id} user has no unit_id.`);
                continue;
            }

            // 3. Get all users in the same unit
            const { data: unitMembers } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('unit_id', user.unit_id)
                .eq('status', 'active');

            if (unitMembers && unitMembers.length > 0) {
                const endTimeFormatted = new Date(booking.end_time).toLocaleTimeString('es-CL', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false // 24hr format as requested
                });

                // 4. Send Push to ALL unit members
                const notifications = unitMembers.map(member =>
                    sendPushNotification(
                        member.id,
                        {
                            title: '⏳ Reserva por finalizar',
                            body: `La reserva de tu unidad finaliza a las ${endTimeFormatted}. Por favor libera el espacio a tiempo.`,
                            url: '/dashboard',
                            type: 'warning'
                        }
                    )
                );

                await Promise.all(notifications);
                sentCount += unitMembers.length;
            }

            // 5. Mark reminder as sent
            await supabaseAdmin
                .from('bookings')
                .update({ reminder_sent: true } as any)
                .eq('id', booking.id);
        }

        return NextResponse.json({
            success: true,
            bookingsProcessed: bookings.length,
            notificationsSent: sentCount
        });

    } catch (err: any) {
        console.error('Cron job error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
