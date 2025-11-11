import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendAppointmentReminder } from '@/lib/email';
import { addHours, subHours, isPast, isFuture } from 'date-fns';

/**
 * GET /api/cron/send-reminders
 * Cron job to send appointment reminders
 * Set up in Vercel/Railway as scheduled task or use external cron service
 * Should run every hour
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const in24Hours = addHours(now, 24);
    const in1Hour = addHours(now, 1);

    console.log('[Cron] Checking for appointments to remind...');

    // Find appointments happening in ~24 hours or ~1 hour
    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctor:doctors(title_prefix, full_name),
        patient:patients(full_name, email)
      `)
      .eq('status', 'confirmed')
      .gte('appointment_time', now.toISOString())
      .lte('appointment_time', in24Hours.toISOString());

    if (error) {
      console.error('[Cron] Error fetching appointments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!appointments || appointments.length === 0) {
      console.log('[Cron] No appointments to remind');
      return NextResponse.json({ 
        success: true, 
        message: 'No appointments to remind',
        count: 0 
      });
    }

    let reminders24h = 0;
    let reminders1h = 0;

    for (const appointment of appointments) {
      const appointmentTime = new Date(appointment.appointment_time);
      const hoursDiff = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Send 24-hour reminder
      if (hoursDiff <= 24 && hoursDiff > 23 && !appointment.reminder_24h_sent) {
        await sendAppointmentReminder(
          appointment.patient.email,
          appointment.patient.full_name,
          appointment.appointment_time,
          `${appointment.doctor.title_prefix || 'Dr.'} ${appointment.doctor.full_name}`
        );

        await supabaseAdmin
          .from('appointments')
          .update({ reminder_24h_sent: true })
          .eq('id', appointment.id);

        reminders24h++;
      }

      // Send 1-hour reminder
      if (hoursDiff <= 1 && hoursDiff > 0.5 && !appointment.reminder_1h_sent) {
        await sendAppointmentReminder(
          appointment.patient.email,
          appointment.patient.full_name,
          appointment.appointment_time,
          `${appointment.doctor.title_prefix || 'Dr.'} ${appointment.doctor.full_name}`
        );

        await supabaseAdmin
          .from('appointments')
          .update({ reminder_1h_sent: true })
          .eq('id', appointment.id);

        reminders1h++;
      }
    }

    console.log(`[Cron] Sent ${reminders24h} 24-hour reminders and ${reminders1h} 1-hour reminders`);

    return NextResponse.json({
      success: true,
      reminders24h,
      reminders1h,
      totalProcessed: appointments.length,
    });

  } catch (error: any) {
    console.error('[Cron] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
