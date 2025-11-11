import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSession, setSessionCookie } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { sanitizeEmail, sanitizeString } from '@/lib/sanitize';

/**
 * POST /api/auth/login
 * Login to patient account
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting to prevent brute force attacks
    const rateLimitResponse = await checkRateLimit(request, RATE_LIMITS.auth);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    let { email, password } = body;

    // Sanitize inputs
    email = sanitizeEmail(email);
    password = typeof password === 'string' ? password.trim() : '';

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Try to find as patient first
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('email', email)
      .single();

    if (patient) {
      // Create session token
      const token = await createSession({
        userId: patient.id,
        email: patient.email,
        fullName: patient.full_name,
        role: 'patient',
      });

      // Return response with session cookie
      const response = NextResponse.json({
        success: true,
        user: {
          userId: patient.id,
          email: patient.email,
          fullName: patient.full_name,
          role: 'patient',
        },
      });

      return setSessionCookie(response, token);
    }

    // Try to find as doctor
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .eq('email', email)
      .single();

    if (doctor) {
      // Create session token
      const token = await createSession({
        userId: doctor.id,
        email: doctor.email,
        fullName: doctor.full_name,
        role: 'doctor',
      });

      // Return response with session cookie
      const response = NextResponse.json({
        success: true,
        user: {
          userId: doctor.id,
          email: doctor.email,
          fullName: doctor.full_name,
          role: 'doctor',
        },
      });

      return setSessionCookie(response, token);
    }

    // No account found
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
