import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateVideoToken } from '@/lib/twilio';
import { canJoinVideo } from '@/lib/utils';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { sanitizeUUID, sanitizeString } from '@/lib/sanitize';

/**
 * POST /api/video/token
 * Generate video access token
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await checkRateLimit(request, RATE_LIMITS.api);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    let { appointment_id, participant_id, participant_name } = body;

    // Sanitize inputs
    const sanitized_appointment_id = sanitizeUUID(appointment_id);
    const sanitized_participant_id = sanitizeUUID(participant_id);
    
    if (!sanitized_appointment_id || !sanitized_participant_id) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    appointment_id = sanitized_appointment_id;
    participant_id = sanitized_participant_id;
    participant_name = sanitizeString(participant_name);

    if (!appointment_id || !participant_id || !participant_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get appointment
    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointment_id)
      .single();

    if (error || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check if participant is authorized (doctor or patient)
    if (
      participant_id !== appointment.doctor_id &&
      participant_id !== appointment.patient_id
    ) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if appointment time is appropriate
    if (!canJoinVideo(appointment.appointment_time)) {
      return NextResponse.json(
        { error: 'Video call not available yet. You can join 15 minutes before the appointment.' },
        { status: 400 }
      );
    }

    // Check appointment status
    if (appointment.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Appointment is not confirmed' },
        { status: 400 }
      );
    }

    // Generate video token
    const tokenData = await generateVideoToken(
      appointment.video_room_id || appointment_id,
      participant_name,
      participant_id
    );

    return NextResponse.json(tokenData);

  } catch (error) {
    console.error('Video token error:', error);
    return NextResponse.json(
      { error: 'Failed to generate video token' },
      { status: 500 }
    );
  }
}
