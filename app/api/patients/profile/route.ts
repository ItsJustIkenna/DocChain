import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/patients/profile
 * Get patient profile
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session || session.role !== 'patient') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('id', session.userId)
      .single();

    if (error || !patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      patient: {
        id: patient.id,
        email: patient.email,
        full_name: patient.full_name,
        phone: patient.phone,
        date_of_birth: patient.date_of_birth,
        sui_address: patient.sui_address,
        created_at: patient.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error fetching patient profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/patients/profile
 * Update patient profile
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session || session.role !== 'patient') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { full_name, phone, date_of_birth } = body;

    // Validate required fields
    if (!full_name) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    // Update patient profile
    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .update({
        full_name,
        phone: phone || null,
        date_of_birth: date_of_birth || null,
      })
      .eq('id', session.userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating patient profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        email: patient.email,
        full_name: patient.full_name,
        phone: patient.phone,
        date_of_birth: patient.date_of_birth,
      },
    });
  } catch (error: any) {
    console.error('Error updating patient profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
