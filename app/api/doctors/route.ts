import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateDoctorData, extractSpecialty } from '@/lib/nppes';
import { createConnectAccount, createAccountLink } from '@/lib/stripe';
import { hashString } from '@/lib/utils';
import { 
  sanitizeEmail, 
  sanitizeString, 
  sanitizeNumber
} from '@/lib/sanitize';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * POST /api/doctors
 * Register a new doctor
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting to prevent registration spam
    const rateLimitResponse = await checkRateLimit(request, RATE_LIMITS.api);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    let {
      email,
      title_prefix,
      full_name,
      specialty,
      npi_number,
      license_number,
      license_state,
      hourly_rate_usd,
      bio,
      years_experience,
    } = body;

    // Sanitize inputs
    email = sanitizeEmail(email);
    full_name = sanitizeString(full_name);
    specialty = sanitizeString(specialty);
    npi_number = sanitizeString(npi_number);
    license_number = sanitizeString(license_number);
    license_state = sanitizeString(license_state);
    bio = bio ? sanitizeString(bio) : null;
    
    const sanitized_hourly_rate = sanitizeNumber(hourly_rate_usd, 0, 1000);
    if (sanitized_hourly_rate === null) {
      return NextResponse.json(
        { error: 'Invalid hourly rate' },
        { status: 400 }
      );
    }
    hourly_rate_usd = sanitized_hourly_rate;

    // Validate required fields
    if (!email || !full_name || !specialty || !npi_number || !license_number || !license_state || !hourly_rate_usd) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Parse name for NPPES validation
    const nameParts = full_name.trim().split(' ').filter((part: string) => part.length > 0);
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];

    // Verify with NPPES
    const validation = await validateDoctorData(
      npi_number,
      firstName,
      lastName,
      license_state
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message, needsManualReview: true },
        { status: 400 }
      );
    }

    // Use provided specialty or extract from NPPES data as fallback
    const doctorSpecialty = specialty || (validation.nppesData ? extractSpecialty(validation.nppesData) : 'General Practice');

    // Create Stripe Connect account
    const stripeAccount = await createConnectAccount(email);

    // Hash license for blockchain
    const licenseHash = await hashString(`${license_number}-${license_state}`);

    // Insert doctor into database
    const { data: doctor, error: dbError } = await supabaseAdmin
      .from('doctors')
      .insert({
        email,
        title_prefix,
        full_name,
        specialty: doctorSpecialty,
        license_number,
        license_state,
        npi_number,
        is_verified: true, // Auto-verified via NPPES
        hourly_rate_usd: hourly_rate_usd * 100, // Convert to cents
        stripe_account_id: stripeAccount.id,
        bio,
        years_experience,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to create doctor account' },
        { status: 500 }
      );
    }

    // Create Stripe account onboarding link
    const accountLink = await createAccountLink(
      stripeAccount.id,
      `${process.env.NEXT_PUBLIC_APP_URL}/doctor/dashboard?onboarding=success`,
      `${process.env.NEXT_PUBLIC_APP_URL}/doctor/onboard?refresh=true`
    );

    // TODO: Register on Sui blockchain (do this after Stripe onboarding completes)

    return NextResponse.json({
      doctor,
      onboardingUrl: accountLink.url,
      nppesData: validation.nppesData,
    });

  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage, details: error },
      { status: 500 }
    );
  }
}

/**
 * GET /api/doctors?specialty=&page=1&limit=10
 * List doctors with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get('specialty');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('doctors')
      .select('*', { count: 'exact' })
      .eq('is_verified', true)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (specialty) {
      query = query.eq('specialty', specialty);
    }

    const { data: doctors, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      doctors,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching doctors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch doctors' },
      { status: 500 }
    );
  }
}
