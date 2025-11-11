import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSession, setSessionCookie } from '@/lib/auth';
import { generateCustodialWallet, encryptPrivateKey } from '@/lib/wallet';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { generateVerificationToken, getVerificationTokenExpiry, sendVerificationEmail } from '@/lib/email';
import { sanitizeEmail, sanitizeString, sanitizePhone, sanitizeISODate } from '@/lib/sanitize';

/**
 * POST /api/auth/signup
 * Create a new patient account
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting to prevent spam registrations
    const rateLimitResponse = await checkRateLimit(request, RATE_LIMITS.auth);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    let { email, password, fullName, phone, dateOfBirth, role = 'patient' } = body;

    // Sanitize inputs
    email = sanitizeEmail(email);
    fullName = sanitizeString(fullName);
    phone = phone ? sanitizePhone(phone) : null;
    dateOfBirth = dateOfBirth ? sanitizeISODate(dateOfBirth) : null;
    password = typeof password === 'string' ? password.trim() : '';

    // Validate required fields
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    if (role === 'doctor') {
      // Check if doctor already exists
      const { data: existingDoctor } = await supabaseAdmin
        .from('doctors')
        .select('id')
        .eq('email', email)
        .single();

      if (existingDoctor) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        );
      }

      // Create basic doctor record (they'll complete profile later)
      const verificationToken = generateVerificationToken();
      const verificationExpiry = getVerificationTokenExpiry();

      const { data: doctor, error } = await supabaseAdmin
        .from('doctors')
        .insert({
          email,
          full_name: fullName,
          specialty: 'General', // Will be updated during onboarding
          license_number: 'PENDING',
          license_state: 'PENDING',
          npi_number: 'PENDING',
          hourly_rate_usd: 5000, // $50 default
          is_verified: false,
          email_verified: false,
          verification_token: verificationToken,
          verification_token_expires: verificationExpiry.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating doctor:', error);
        return NextResponse.json(
          { error: 'Failed to create account' },
          { status: 500 }
        );
      }

      // Send verification email
      await sendVerificationEmail(email, verificationToken, fullName);

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
          id: doctor.id,
          email: doctor.email,
          fullName: doctor.full_name,
          role: 'doctor',
        },
        redirectTo: '/doctors/onboard', // Redirect to complete profile
      });

      return setSessionCookie(response, token);
    }

    // Patient signup
    // Check if user already exists
    const { data: existingPatient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('email', email)
      .single();

    if (existingPatient) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Generate custodial Sui wallet for the patient
    console.log('[Signup] Generating custodial wallet for patient...');
    const wallet = generateCustodialWallet();
    const encryptedPrivateKey = encryptPrivateKey(wallet.privateKey);
    console.log('[Signup] Wallet generated:', wallet.address);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationExpiry = getVerificationTokenExpiry();

    // Create patient record with custodial wallet
    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .insert({
        email,
        full_name: fullName,
        phone: phone || null,
        date_of_birth: dateOfBirth || null,
        sui_address: wallet.address,
        sui_private_key_encrypted: encryptedPrivateKey,
        email_verified: false,
        verification_token: verificationToken,
        verification_token_expires: verificationExpiry.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating patient:', error);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Send verification email
    await sendVerificationEmail(email, verificationToken, fullName);

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
      redirectTo: '/dashboard',
    });

    return setSessionCookie(response, token);

  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An error occurred during signup' },
      { status: 500 }
    );
  }
}
