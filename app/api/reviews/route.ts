import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/reviews
 * Create a new review for a completed appointment
 */
export async function POST(request: Request) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { appointmentId, rating, comment } = await request.json();

    // Validation
    if (!appointmentId || !rating) {
      return NextResponse.json(
        { error: 'Appointment ID and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Get appointment details
    const { data: appointment, error: aptError } = await supabaseAdmin
      .from('appointments')
      .select('id, patient_id, doctor_id, status')
      .eq('id', appointmentId)
      .single();

    if (aptError || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Verify appointment belongs to user and is completed
    if (appointment.patient_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only review your own appointments' },
        { status: 403 }
      );
    }

    if (appointment.status !== 'completed') {
      return NextResponse.json(
        { error: 'You can only review completed appointments' },
        { status: 400 }
      );
    }

    // Check if review already exists
    const { data: existingReview } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('appointment_id', appointmentId)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this appointment' },
        { status: 400 }
      );
    }

    // Create review
    const { data: review, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .insert({
        doctor_id: appointment.doctor_id,
        patient_id: user.id,
        appointment_id: appointmentId,
        rating,
        comment: comment || null,
        is_verified: true,
      })
      .select()
      .single();

    if (reviewError) {
      console.error('Failed to create review:', reviewError);
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      );
    }

    // Log the action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'review_created',
      resource_type: 'review',
      resource_id: review.id,
      details: {
        doctor_id: appointment.doctor_id,
        appointment_id: appointmentId,
        rating,
      },
    });

    return NextResponse.json({
      success: true,
      review,
    });

  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reviews?doctorId=xxx or GET /api/reviews?patientId=xxx
 * Fetch reviews for a doctor or by a patient
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');
    const patientId = searchParams.get('patientId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('reviews')
      .select(`
        *,
        patient:profiles!reviews_patient_id_fkey(id, full_name),
        doctor:profiles!reviews_doctor_id_fkey(id, full_name, specialty),
        helpful_count:review_votes(count)
      `)
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (doctorId) {
      query = query.eq('doctor_id', doctorId);
    } else if (patientId) {
      query = query.eq('patient_id', patientId);
    } else {
      return NextResponse.json(
        { error: 'doctorId or patientId is required' },
        { status: 400 }
      );
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error('Failed to fetch reviews:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reviews: reviews || [],
      count: reviews?.length || 0,
    });

  } catch (error) {
    console.error('Fetch reviews error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
