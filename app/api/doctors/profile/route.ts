import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

/**
 * GET /api/doctors/profile
 * Get current doctor's profile
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: doctor, error } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .eq('id', session.userId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ doctor });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/doctors/profile
 * Update current doctor's profile
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title_prefix,
      full_name,
      specialty,
      license_number,
      license_state,
      npi_number,
      years_experience,
      hourly_rate_usd,
      bio,
    } = body;

    // Validate required fields
    if (!full_name || !specialty || !license_number || !license_state || !npi_number) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate NPI format (10 digits)
    if (!/^\d{10}$/.test(npi_number)) {
      return NextResponse.json(
        { error: 'NPI number must be exactly 10 digits' },
        { status: 400 }
      );
    }

    // Update doctor profile
    const { data: doctor, error } = await supabaseAdmin
      .from('doctors')
      .update({
        title_prefix,
        full_name,
        specialty,
        license_number,
        license_state: license_state.toUpperCase(),
        npi_number,
        years_experience: parseInt(years_experience),
        hourly_rate_usd: parseInt(hourly_rate_usd) * 100, // Convert dollars to cents
        bio,
        is_verified: false, // Set to false until admin verifies
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      doctor,
      message: 'Profile updated successfully. Pending verification.' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
