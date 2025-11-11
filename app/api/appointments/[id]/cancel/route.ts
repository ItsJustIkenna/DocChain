import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createRefund } from '@/lib/stripe';
import { calculateRefund } from '@/lib/utils';
import { recordCancellationOnSui } from '@/lib/sui';

/**
 * POST /api/appointments/[id]/cancel
 * Cancel an appointment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { reason, cancelled_by } = body;

    // Get appointment
    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    if (appointment.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Appointment already cancelled' },
        { status: 400 }
      );
    }

    if (appointment.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel completed appointment' },
        { status: 400 }
      );
    }

    // Calculate refund based on policy
    const refundDetails = calculateRefund(
      appointment.price_usd,
      appointment.appointment_time
    );

    let stripeRefund = null;

    // Process Stripe refund if payment was made
    if (appointment.stripe_payment_intent_id && refundDetails.refundAmount > 0) {
      stripeRefund = await createRefund(
        appointment.stripe_payment_intent_id,
        refundDetails.refundAmount,
        'requested_by_customer'
      );
    }

    // Update appointment
    const { data: updatedAppointment } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    // Record on blockchain
    try {
      await recordCancellationOnSui(
        appointment.id,
        refundDetails.refundAmount
      );
    } catch (suiError) {
      console.error('Sui blockchain error:', suiError);
      // Don't fail the whole operation if blockchain recording fails
    }

    return NextResponse.json({
      appointment: updatedAppointment,
      refund: {
        ...refundDetails,
        stripeRefundId: stripeRefund?.id,
      },
    });

  } catch (error) {
    console.error('Cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel appointment' },
      { status: 500 }
    );
  }
}
