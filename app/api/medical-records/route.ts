import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';
import { encrypt, decrypt, generateHash, getPatientEncryptionKey } from '@/lib/encryption';
import { sanitizeUUID, sanitizeString, sanitizeMedicalText } from '@/lib/sanitize';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/medical-records
 * Get medical records (patients see their own, doctors see what they have access to)
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await checkRateLimit(request, RATE_LIMITS.api);
    if (rateLimitResponse) return rateLimitResponse;

    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');
    const recordId = searchParams.get('record_id');

    // Patients can only see their own records
    if (session.role === 'patient') {
      const { data: patient } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('user_id', session.userId)
        .single();

      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      // Get all patient's records (simplified - no actual encryption for demo)
      const { data: records, error } = await supabaseAdmin
        .from('appointments')
        .select(`
          id,
          appointment_time,
          notes,
          status,
          doctor:doctors(id, full_name, specialty)
        `)
        .eq('patient_id', patient.id)
        .not('notes', 'is', null)
        .order('appointment_time', { ascending: false });

      if (error) {
        console.error('Error fetching records:', error);
        return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
      }

      // Transform to medical records format
      const medicalRecords = records?.map(record => ({
        id: record.id,
        record_type: 'consultation_note',
        title: `Consultation with ${(record.doctor as any)?.full_name}`,
        description: record.notes,
        created_at: record.appointment_time,
        doctor: record.doctor,
        status: record.status,
      })) || [];

      return NextResponse.json({ records: medicalRecords });
    }

    // Doctors can see records they created
    if (session.role === 'doctor') {
      const { data: doctor } = await supabaseAdmin
        .from('doctors')
        .select('id')
        .eq('user_id', session.userId)
        .single();

      if (!doctor) {
        return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
      }

      let query = supabaseAdmin
        .from('appointments')
        .select(`
          id,
          appointment_time,
          notes,
          status,
          patient:patients(id, full_name, email)
        `)
        .eq('doctor_id', doctor.id)
        .not('notes', 'is', null);

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      if (recordId) {
        query = query.eq('id', recordId);
      }

      const { data: records, error } = await query.order('appointment_time', { ascending: false });

      if (error) {
        console.error('Error fetching records:', error);
        return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
      }

      const medicalRecords = records?.map(record => ({
        id: record.id,
        record_type: 'consultation_note',
        title: `Consultation with ${(record.patient as any)?.full_name}`,
        description: record.notes,
        created_at: record.appointment_time,
        patient: record.patient,
        status: record.status,
      })) || [];

      return NextResponse.json({ records: medicalRecords });
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch (error) {
    console.error('Error in medical records API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/medical-records
 * Create a new medical record (doctors only)
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await checkRateLimit(request, RATE_LIMITS.api);
    if (rateLimitResponse) return rateLimitResponse;

    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let { appointment_id, record_type, title, description } = body;

    // Sanitize inputs
    const sanitized_appointment_id = sanitizeUUID(appointment_id);
    if (!sanitized_appointment_id) {
      return NextResponse.json(
        { error: 'Invalid appointment ID format' },
        { status: 400 }
      );
    }
    appointment_id = sanitized_appointment_id;

    record_type = record_type ? sanitizeString(record_type) : 'general';
    title = title ? sanitizeString(title) : '';
    description = sanitizeMedicalText(description, 50000);

    if (!appointment_id || !description) {
      return NextResponse.json(
        { error: 'Appointment ID and description are required' },
        { status: 400 }
      );
    }

    // Get doctor
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', session.userId)
      .single();

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // Verify appointment belongs to this doctor
    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .select('id, patient_id, doctor_id')
      .eq('id', appointment_id)
      .single();

    if (!appointment || appointment.doctor_id !== doctor.id) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Update appointment with notes (simplified - using notes field instead of separate medical_records table)
    const { data: updatedAppointment, error } = await supabaseAdmin
      .from('appointments')
      .update({ notes: description })
      .eq('id', appointment_id)
      .select()
      .single();

    if (error) {
      console.error('Error creating medical record:', error);
      return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Medical record created successfully',
      record: {
        id: updatedAppointment.id,
        record_type: 'consultation_note',
        title: title || 'Consultation Note',
        description,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating medical record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
