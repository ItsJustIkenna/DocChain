import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/doctors/availability
 * Get doctor's availability schedule
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySession(sessionToken);
    if (!session || session.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get doctor's profile to find their ID
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', session.userId)
      .single();

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // For now, return a default schedule structure
    // In a production app, this would come from a doctor_availability table
    const defaultSchedule = {
      doctor_id: doctor.id,
      schedule: {
        monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
        tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
        wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
        thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
        friday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
        saturday: { enabled: false, slots: [] },
        sunday: { enabled: false, slots: [] },
      },
      blocked_dates: [],
    };

    return NextResponse.json({ availability: defaultSchedule });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/doctors/availability
 * Update doctor's availability schedule
 */
export async function PUT(request: NextRequest) {
  try {
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
    const { schedule, blocked_dates } = body;

    // Get doctor's profile
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', session.userId)
      .single();

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // In production, save to doctor_availability table
    // For now, just return success
    const availability = {
      doctor_id: doctor.id,
      schedule,
      blocked_dates: blocked_dates || [],
    };

    return NextResponse.json({ 
      message: 'Availability updated successfully',
      availability 
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
