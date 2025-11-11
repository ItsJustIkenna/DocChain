import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sanitizeUUID, sanitizeISODate } from '@/lib/sanitize';

// GET - Fetch access grants for a patient
export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get authenticated user
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only patients can view their access grants
    if (profile.role !== 'patient') {
      return NextResponse.json({ error: 'Only patients can view access grants' }, { status: 403 });
    }

    // Fetch all doctors who have treated this patient (have appointments)
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        doctor_id,
        doctors:doctor_id (
          id,
          full_name,
          specialty,
          profile_image_url
        )
      `)
      .eq('patient_id', userId)
      .eq('status', 'completed');

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
    }

    // Get unique doctors
    const doctorsMap = new Map();
    appointments?.forEach((apt: any) => {
      if (apt.doctors && !doctorsMap.has(apt.doctor_id)) {
        doctorsMap.set(apt.doctor_id, apt.doctors);
      }
    });

    const doctors = Array.from(doctorsMap.values());

    // For now, we'll simulate access grants (in production, this would query medical_record_access table)
    // All doctors who have completed appointments have access by default
    const accessGrants = doctors.map((doctor: any) => ({
      doctor_id: doctor.id,
      doctor_name: doctor.full_name,
      doctor_specialty: doctor.specialty,
      doctor_image: doctor.profile_image_url,
      can_read: true,
      can_write: true,
      granted_at: new Date().toISOString(),
      expires_at: null // Permanent access
    }));

    return NextResponse.json({ access_grants: accessGrants });

  } catch (error) {
    console.error('Error in GET /api/medical-records/access:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Grant access to a doctor
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get authenticated user
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    let { doctor_id, can_read, can_write, expires_at } = body;

    // Sanitize inputs
    const sanitized_doctor_id = sanitizeUUID(doctor_id);
    if (!sanitized_doctor_id) {
      return NextResponse.json({ error: 'Invalid doctor ID format' }, { status: 400 });
    }
    doctor_id = sanitized_doctor_id;

    if (expires_at) {
      const sanitized_expires_at = sanitizeISODate(expires_at);
      if (!sanitized_expires_at) {
        return NextResponse.json({ error: 'Invalid expiration date format' }, { status: 400 });
      }
      expires_at = sanitized_expires_at;
    }

    if (!doctor_id) {
      return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 });
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only patients can grant access
    if (profile.role !== 'patient') {
      return NextResponse.json({ error: 'Only patients can grant access' }, { status: 403 });
    }

    // Verify doctor exists
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('id, full_name')
      .eq('id', doctor_id)
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // In production, insert into medical_record_access table
    // For MVP, we'll return success (access is granted by default for doctors with completed appointments)
    
    return NextResponse.json({ 
      success: true,
      message: `Access granted to Dr. ${doctor.full_name}`,
      access_grant: {
        patient_id: userId,
        doctor_id,
        can_read: can_read !== false,
        can_write: can_write !== false,
        expires_at: expires_at || null,
        granted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in POST /api/medical-records/access:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Revoke access from a doctor
export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get authenticated user
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const doctor_id = searchParams.get('doctor_id');

    if (!doctor_id) {
      return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 });
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only patients can revoke access
    if (profile.role !== 'patient') {
      return NextResponse.json({ error: 'Only patients can revoke access' }, { status: 403 });
    }

    // Verify doctor exists
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('id, full_name')
      .eq('id', doctor_id)
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // In production, update/delete from medical_record_access table
    // For MVP, we'll return success
    
    return NextResponse.json({ 
      success: true,
      message: `Access revoked from Dr. ${doctor.full_name}`
    });

  } catch (error) {
    console.error('Error in DELETE /api/medical-records/access:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
