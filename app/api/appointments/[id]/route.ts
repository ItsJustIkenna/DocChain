import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { encrypt, decrypt } from '@/lib/encryption';
import { stripe } from '@/lib/stripe';
import { sanitizeUUID, sanitizeString, sanitizeMedicalText } from '@/lib/sanitize';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/appointments/[id]
 * Get appointment details with payment info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctor:doctors(title_prefix, full_name, specialty, photo_url),
        patient:patients(full_name, email, phone)
      `)
      .eq('id', id)
      .single();

    if (error || !appointment) {
      console.error('Appointment fetch error:', error);
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Decrypt notes if present (for authorized users)
    if (appointment.notes) {
      try {
        const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key';
        appointment.notes = await decrypt(appointment.notes, encryptionKey);
      } catch (decryptError) {
        console.error('Failed to decrypt notes:', decryptError);
        // Keep encrypted notes rather than failing the request
        appointment.notes = '[Encrypted]';
      }
    }

    // Get payment intent client secret from Stripe if needed
    let clientSecret = null;
    if (appointment.stripe_payment_intent_id && appointment.status === 'pending') {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          appointment.stripe_payment_intent_id
        );
        clientSecret = paymentIntent.client_secret;
      } catch (stripeError) {
        console.error('Error retrieving payment intent:', stripeError);
      }
    }

    return NextResponse.json({
      appointment,
      clientSecret,
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/appointments/[id]
 * Update appointment status (for doctors to accept/reject/complete)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let { id } = params;
    const body = await request.json();
    let { status, notes } = body;

    // Sanitize inputs
    const sanitized_id = sanitizeUUID(id);
    if (!sanitized_id) {
      return NextResponse.json(
        { error: 'Invalid appointment ID' },
        { status: 400 }
      );
    }
    id = sanitized_id;

    if (status) {
      status = sanitizeString(status);
    }

    if (notes) {
      notes = sanitizeMedicalText(notes);
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update appointment
    const updateData: any = { status };
    if (notes !== undefined) {
      // Encrypt notes before storing (HIPAA compliance)
      const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key';
      updateData.notes = await encrypt(notes, encryptionKey);
    }

    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        doctor:doctors(title_prefix, full_name, specialty),
        patient:patients(full_name, email, phone)
      `)
      .single();

    if (error || !appointment) {
      console.error('Appointment update error:', error);
      return NextResponse.json(
        { error: 'Failed to update appointment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
