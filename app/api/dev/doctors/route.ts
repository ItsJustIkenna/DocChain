import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/dev/doctors
 * Development endpoint to list doctors and generate login credentials
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const { data: doctors, error } = await supabaseAdmin
    .from('doctors')
    .select('id, email, full_name, npi_number, specialty, is_verified')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    doctors,
    note: 'Use the login endpoint with any of these emails and any password to log in (password not validated in MVP)',
  });
}
