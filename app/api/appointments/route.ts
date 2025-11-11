import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createPaymentIntent, calculateFees, stripe } from '@/lib/stripe';
import { addMinutes, parseISO } from 'date-fns';
import { validateAppointmentTime } from '@/lib/availability';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { decrypt } from '@/lib/encryption';
import { sanitizeEmail, sanitizeString, sanitizePhone, sanitizeUUID, sanitizeISODate } from '@/lib/sanitize';

/**
 * POST /api/appointments/book
 * Create new appointment and payment intent
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting to prevent booking abuse
    const rateLimitResponse = await checkRateLimit(request, RATE_LIMITS.booking);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    console.log('[Appointments API] Creating appointment:', body);
    let {
      doctor_id,
      patient_id,
      patient_info,
      appointment_time,
      duration_minutes = 30,
    } = body;

    // Sanitize inputs
    const sanitized_doctor_id = sanitizeUUID(doctor_id);
    const sanitized_patient_id = patient_id ? sanitizeUUID(patient_id) : null;
    const sanitized_appointment_time = sanitizeISODate(appointment_time);

    if (!sanitized_doctor_id || !sanitized_appointment_time) {
      return NextResponse.json(
        { error: 'Invalid doctor_id or appointment_time format' },
        { status: 400 }
      );
    }

    doctor_id = sanitized_doctor_id;
    patient_id = sanitized_patient_id;
    appointment_time = sanitized_appointment_time;

    // Sanitize patient_info if provided
    if (patient_info) {
      patient_info.email = sanitizeEmail(patient_info.email);
      patient_info.full_name = sanitizeString(patient_info.full_name);
      patient_info.phone = patient_info.phone ? sanitizePhone(patient_info.phone) : null;
      patient_info.date_of_birth = patient_info.date_of_birth ? sanitizeISODate(patient_info.date_of_birth) : null;
    }

    // Validate required fields
    if (!doctor_id || !appointment_time) {
      return NextResponse.json(
        { error: 'Missing required fields: doctor_id and appointment_time are required' },
        { status: 400 }
      );
    }

    // If patient_info is provided, create or find patient
    let finalPatientId = patient_id;
    
    if (patient_info && !patient_id) {
      // Check if patient exists by email
      const { data: existingPatient } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('email', patient_info.email)
        .single();

      if (existingPatient) {
        finalPatientId = existingPatient.id;
      } else {
        // Create new patient
        const { data: newPatient, error: patientError } = await supabaseAdmin
          .from('patients')
          .insert({
            email: patient_info.email,
            full_name: patient_info.full_name,
            phone: patient_info.phone,
            date_of_birth: patient_info.date_of_birth,
          })
          .select()
          .single();

        if (patientError) {
          console.error('Patient creation error:', patientError);
          return NextResponse.json(
            { error: 'Failed to create patient record' },
            { status: 500 }
          );
        }

        if (!newPatient) {
          return NextResponse.json(
            { error: 'Failed to create patient - no data returned' },
            { status: 500 }
          );
        }

        finalPatientId = newPatient.id;
      }
    }

    if (!finalPatientId) {
      return NextResponse.json(
        { error: 'Patient ID or patient info is required' },
        { status: 400 }
      );
    }

    // Get doctor details
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .eq('id', doctor_id)
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // In development, only check if verified. In production, also require Stripe Connect
    const isProduction = process.env.NODE_ENV === 'production';
    if (!doctor.is_verified) {
      return NextResponse.json(
        { error: 'Doctor not verified yet' },
        { status: 400 }
      );
    }
    
    if (isProduction && !doctor.stripe_account_id) {
      return NextResponse.json(
        { error: 'Doctor has not connected Stripe account' },
        { status: 400 }
      );
    }

    // Validate appointment time and check for conflicts
    console.log('[Appointments API] Validating appointment time and availability...');
    const validationError = await validateAppointmentTime(
      supabaseAdmin,
      doctor_id,
      appointment_time,
      duration_minutes
    );

    if (validationError) {
      console.log('[Appointments API] Validation failed:', validationError);
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    console.log('[Appointments API] ✓ Appointment time validated successfully');

    // Calculate price
    const pricePerMinute = doctor.hourly_rate_usd / 60;
    const priceUsd = Math.round(pricePerMinute * duration_minutes);
    let fees = calculateFees(priceUsd);

    // Create appointment record (pending payment)
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .insert({
        doctor_id,
        patient_id: finalPatientId,
        appointment_time,
        duration_minutes,
        status: 'pending',
        price_usd: fees.total,
        platform_fee_usd: fees.platformFee,
        doctor_payout_usd: fees.doctorPayout,
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('Appointment creation error:', appointmentError);
      return NextResponse.json(
        { error: 'Failed to create appointment' },
        { status: 500 }
      );
    }

    // Create Stripe payment intent
    // For testing: create without transfer if doctor hasn't completed onboarding
    let paymentIntent;
    
    try {
      const paymentIntentResult = await createPaymentIntent(
        fees.total,
        doctor.stripe_account_id,
        {
          appointment_id: appointment.id,
          doctor_id,
          patient_id: finalPatientId,
        }
      );
      paymentIntent = paymentIntentResult.paymentIntent;
    } catch (stripeError: any) {
      // If transfer fails due to incomplete onboarding, create a simple payment intent
      if (stripeError.code === 'insufficient_capabilities_for_transfer') {
        console.log('Doctor onboarding incomplete, creating direct payment intent');
        
        const simpleIntent = await stripe.paymentIntents.create({
          amount: fees.total,
          currency: 'usd',
          metadata: {
            appointment_id: appointment.id,
            doctor_id,
            patient_id: finalPatientId,
            note: 'Doctor onboarding incomplete - manual payout required',
          },
          automatic_payment_methods: {
            enabled: true,
          },
        });
        
        paymentIntent = simpleIntent;
      } else {
        throw stripeError;
      }
    }

    // Update appointment with payment intent ID
    await supabaseAdmin
      .from('appointments')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', appointment.id);

    return NextResponse.json({
      appointment: {
        ...appointment,
        stripe_payment_intent_id: paymentIntent.id,
      },
      clientSecret: paymentIntent.client_secret,
      fees,
    });

  } catch (error) {
    console.error('[Appointments API] Booking error:', error);
    console.error('[Appointments API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[Appointments API] Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/appointments?doctor_id=&patient_id=&status=
 * List appointments with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctor_id');
    const patientId = searchParams.get('patient_id');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctor:doctors(*),
        patient:patients(*)
      `)
      .order('appointment_time', { ascending: true });

    if (doctorId) {
      query = query.eq('doctor_id', doctorId);
    }

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: appointments, error } = await query;

    if (error) {
      throw error;
    }

    // Decrypt notes for all appointments
    if (appointments) {
      const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key';
      for (const appointment of appointments) {
        if (appointment.notes) {
          try {
            appointment.notes = await decrypt(appointment.notes, encryptionKey);
          } catch (decryptError) {
            console.error('Failed to decrypt notes for appointment:', appointment.id);
            appointment.notes = '[Encrypted]';
          }
        }
      }
    }

    return NextResponse.json({ appointments });

  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}
