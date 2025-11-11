import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyWebhookSignature } from '@/lib/stripe';
import { recordAppointmentOnSui } from '@/lib/sui';
import { createVideoRoom } from '@/lib/twilio';
import { logPaymentProcessed, logFailedAction } from '@/lib/audit';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  console.log('[Stripe Webhook] ====== NEW WEBHOOK REQUEST ======');
  
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;
    
    console.log('[Stripe Webhook] Body length:', body.length);
    console.log('[Stripe Webhook] Has signature:', !!signature);
    
    if (!signature) {
      console.log('[Stripe Webhook] ERROR: No signature provided');
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    console.log('[Stripe Webhook] Verifying signature with secret:', process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10) + '...');
    let event;
    try {
      event = verifyWebhookSignature(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      console.log('[Stripe Webhook] ✓ Signature verified successfully');
    } catch (err) {
      console.error('[Stripe Webhook] ✗ Signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }
    
    console.log('[Stripe Webhook] Event type:', event.type);
    console.log('[Stripe Webhook] Event ID:', event.id);

    // Process async to not block webhook response
    if (event.type === 'payment_intent.succeeded') {
      console.log('[Stripe Webhook] Processing payment success asynchronously');
      // Process in background
      handlePaymentSuccess(event.data.object).catch(err => {
        console.error('[Stripe Webhook] Payment processing error:', err);
      });
    } else if (event.type === 'payment_intent.payment_failed') {
      handlePaymentFailed(event.data.object).catch(err => {
        console.error('[Stripe Webhook] Payment failed handler error:', err);
      });
    } else if (event.type === 'account.updated') {
      handleAccountUpdated(event.data.object).catch(err => {
        console.error('[Stripe Webhook] Account update error:', err);
      });
    } else {
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    // Return immediately
    console.log('[Stripe Webhook] Returning 200 response');
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[Stripe Webhook] FATAL ERROR:', error);
    console.error('[Stripe Webhook] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    );
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentIntent: any) {
  console.log('[handlePaymentSuccess] Starting...');
  const appointmentId = paymentIntent.metadata.appointment_id;
  console.log('[handlePaymentSuccess] Appointment ID:', appointmentId);

  if (!appointmentId) {
    console.error('[handlePaymentSuccess] No appointment_id in payment intent metadata');
    return;
  }

  // Get appointment
  console.log('[handlePaymentSuccess] Fetching appointment...');
  const { data: appointment } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single();

  if (!appointment) {
    console.error(`[handlePaymentSuccess] Appointment ${appointmentId} not found`);
    return;
  }
  
  console.log('[handlePaymentSuccess] Appointment found:', appointment.id);

  // Create video room
  let videoRoomId = null;
  let twilioRoomSid = null;
  try {
    console.log('[handlePaymentSuccess] Creating Twilio video room...');
    const room = await createVideoRoom(appointmentId);
    videoRoomId = room.uniqueName || appointmentId;
    twilioRoomSid = room.sid;
    console.log('[handlePaymentSuccess] Video room created - Name:', videoRoomId, 'SID:', twilioRoomSid);
  } catch (error) {
    console.error('[handlePaymentSuccess] Failed to create video room:', error);
    // Non-critical error - continue with appointment confirmation
  }

  // Update appointment status
  console.log('[handlePaymentSuccess] Updating appointment status...');
  const { data: statusUpdateData, error: statusUpdateError } = await supabaseAdmin
    .from('appointments')
    .update({
      status: 'confirmed',
      video_room_id: videoRoomId,
      twilio_room_sid: twilioRoomSid,
    })
    .eq('id', appointmentId)
    .select();
  
  if (statusUpdateError) {
    console.error('[handlePaymentSuccess] Error updating appointment status:', statusUpdateError);
  }
  console.log('[handlePaymentSuccess] Status update result:', JSON.stringify(statusUpdateData, null, 2));
  console.log('[handlePaymentSuccess] Appointment updated to confirmed');

  // Record on Sui blockchain
  console.log('[handlePaymentSuccess] Starting blockchain recording...');
  try {
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('sui_address, sui_doctor_profile_id')
      .eq('id', appointment.doctor_id)
      .single();
    
    console.log('[handlePaymentSuccess] Doctor sui_address:', doctor?.sui_address);
    console.log('[handlePaymentSuccess] Doctor profile ID:', doctor?.sui_doctor_profile_id);

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('sui_address')
      .eq('id', appointment.patient_id)
      .single();
    
    console.log('[handlePaymentSuccess] Patient sui_address:', patient?.sui_address);

    if (doctor?.sui_doctor_profile_id) {
      console.log('[handlePaymentSuccess] Doctor registered, recording to blockchain...');
      
      // Use patient address if available, otherwise use placeholder for MVP
      const patientAddress = patient?.sui_address || '0x0000000000000000000000000000000000000000000000000000000000000000';
      if (!patient?.sui_address) {
        console.log('[handlePaymentSuccess] Using placeholder patient address (0x0) for MVP');
      }
      
      const result = await recordAppointmentOnSui(
        doctor.sui_address, // Use the doctor's wallet address
        appointmentId,
        patientAddress,
        new Date(appointment.appointment_time).getTime(),
        appointment.price_usd
      );
      
      console.log('[handlePaymentSuccess] Blockchain recording successful!');
      console.log('[handlePaymentSuccess] Transaction digest:', result.digest);

      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('appointments')
        .update({ sui_transaction_digest: result.digest })
        .eq('id', appointmentId)
        .select();
      
      if (updateError) {
        console.error('[handlePaymentSuccess] Failed to save transaction digest:', updateError);
      } else {
        console.log('[handlePaymentSuccess] Transaction digest saved to database');
        console.log('[handlePaymentSuccess] Updated appointment:', updateData);
      }
    } else {
      console.log('[handlePaymentSuccess] ⚠️  Skipping blockchain recording - doctor not registered on Sui');
      console.log('[handlePaymentSuccess] Doctor needs to be registered on blockchain first');
      
      // Mark appointment with blockchain recording pending
      await supabaseAdmin
        .from('appointments')
        .update({ 
          blockchain_recording_failed: true,
          blockchain_error_message: 'Doctor not registered on blockchain'
        })
        .eq('id', appointmentId);
    }
  } catch (suiError: any) {
    console.error('[handlePaymentSuccess] Sui blockchain error:', suiError);
    
    // Mark appointment with blockchain recording error
    await supabaseAdmin
      .from('appointments')
      .update({ 
        blockchain_recording_failed: true,
        blockchain_error_message: suiError.message || 'Unknown blockchain error',
        blockchain_error_at: new Date().toISOString()
      })
      .eq('id', appointmentId);
    
    // Don't fail the whole operation - appointment still valid even if blockchain fails
    console.log('[handlePaymentSuccess] ⚠️  Appointment confirmed but blockchain recording failed');
  }

  // Log successful payment to audit trail
  await logPaymentProcessed(
    appointment.patient_id,
    appointmentId,
    paymentIntent.amount,
    paymentIntent.id
  );

  // TODO: Send confirmation email/SMS
  console.log(`[handlePaymentSuccess] ✓ Appointment ${appointmentId} confirmed`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent: any) {
  const appointmentId = paymentIntent.metadata.appointment_id;

  if (!appointmentId) return;

  // Update appointment status
  await supabaseAdmin
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId);

  console.log(`Payment failed for appointment ${appointmentId}`);
}

/**
 * Handle Stripe Connect account updates
 */
async function handleAccountUpdated(account: any) {
  // Update doctor's Stripe account status
  await supabaseAdmin
    .from('doctors')
    .update({
      // Store any relevant account details
    })
    .eq('stripe_account_id', account.id);

  console.log(`Stripe account ${account.id} updated`);
}
