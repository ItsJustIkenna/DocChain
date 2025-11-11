import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { sendAppointmentRescheduled } from '@/lib/email';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

/**
 * POST /api/appointments/[id]/reschedule
 * Reschedule an appointment with refund logic
 * 
 * Refund Policy:
 * - More than 24 hours before: 100% refund
 * - 4-24 hours before: 50% refund
 * - Less than 4 hours before: No refund
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { newDateTime } = await request.json();

    if (!newDateTime) {
      return NextResponse.json(
        { error: 'New date and time are required' },
        { status: 400 }
      );
    }

    const appointmentId = params.id;

    // Get existing appointment
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        patient:profiles!appointments_patient_id_fkey(id, email, full_name),
        doctor:profiles!appointments_doctor_id_fkey(id, email, full_name, hourly_rate_usd)
      `)
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Verify user owns this appointment
    if (appointment.patient_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only reschedule your own appointments' },
        { status: 403 }
      );
    }

    // Check if appointment can be rescheduled
    if (appointment.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot reschedule a cancelled appointment' },
        { status: 400 }
      );
    }

    if (appointment.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot reschedule a completed appointment' },
        { status: 400 }
      );
    }

    const now = new Date();
    const appointmentTime = new Date(appointment.appointment_date);
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Calculate refund amount based on policy
    let refundPercentage = 0;
    let refundAmount = 0;

    if (hoursUntilAppointment > 24) {
      refundPercentage = 100;
    } else if (hoursUntilAppointment > 4) {
      refundPercentage = 50;
    } else {
      refundPercentage = 0;
    }

    const originalAmount = appointment.amount_paid_usd || appointment.doctor.hourly_rate_usd;
    refundAmount = (originalAmount * refundPercentage) / 100;

    // Process refund via Stripe if applicable
    let refundId = null;
    if (refundAmount > 0 && appointment.stripe_payment_intent_id) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: appointment.stripe_payment_intent_id,
          amount: Math.round(refundAmount * 100), // Convert to cents
        });
        refundId = refund.id;
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError);
        // Don't fail the whole operation if refund fails
        // Could be logged for manual processing
      }
    }

    // Update appointment with new date/time
    const { data: updatedAppointment, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({
        appointment_date: newDateTime,
        status: 'rescheduled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update appointment:', updateError);
      return NextResponse.json(
        { error: 'Failed to reschedule appointment' },
        { status: 500 }
      );
    }

    // Log the reschedule action in audit logs
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'appointment_rescheduled',
      resource_type: 'appointment',
      resource_id: appointmentId,
      details: {
        old_date: appointment.appointment_date,
        new_date: newDateTime,
        refund_amount: refundAmount,
        refund_percentage: refundPercentage,
        refund_id: refundId,
      },
    });

    // Send rescheduled notification email
    await sendAppointmentRescheduled({
      patientEmail: appointment.patient.email,
      patientName: appointment.patient.full_name,
      doctorName: appointment.doctor.full_name,
      oldDate: new Date(appointment.appointment_date),
      newDate: new Date(newDateTime),
      appointmentType: appointment.appointment_type || 'Consultation',
      refundAmount,
    });

    return NextResponse.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment: updatedAppointment,
      refund: {
        amount: refundAmount,
        percentage: refundPercentage,
        refund_id: refundId,
      },
    });

  } catch (error) {
    console.error('Reschedule appointment error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
