import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/doctors/[id]
 * Get doctor details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: doctor, error } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // Get availability
    const { data: availability } = await supabaseAdmin
      .from('availability_slots')
      .select('*')
      .eq('doctor_id', params.id);

    return NextResponse.json({
      doctor,
      availability: availability || [],
    });

  } catch (error) {
    console.error('Error fetching doctor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch doctor' },
      { status: 500 }
    );
  }
}
