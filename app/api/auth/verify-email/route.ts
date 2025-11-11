import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isVerificationTokenValid } from '@/lib/email';

/**
 * GET /api/auth/verify-email?token=xxx
 * Verify user's email address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Check patients table
    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('id, email, verification_token_expires, email_verified')
      .eq('verification_token', token)
      .single();

    if (patient && !patientError) {
      // Validate token expiry
      if (!isVerificationTokenValid(patient.verification_token_expires)) {
        return NextResponse.json(
          { error: 'Verification token has expired. Please request a new one.' },
          { status: 400 }
        );
      }

      if (patient.email_verified) {
        return NextResponse.json(
          { message: 'Email already verified', alreadyVerified: true },
          { status: 200 }
        );
      }

      // Mark as verified
      await supabaseAdmin
        .from('patients')
        .update({
          email_verified: true,
          verification_token: null,
          verification_token_expires: null,
        })
        .eq('id', patient.id);

      return NextResponse.json({
        success: true,
        message: 'Email verified successfully!',
      });
    }

    // Check doctors table
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from('doctors')
      .select('id, email, verification_token_expires, email_verified')
      .eq('verification_token', token)
      .single();

    if (doctor && !doctorError) {
      // Validate token expiry
      if (!isVerificationTokenValid(doctor.verification_token_expires)) {
        return NextResponse.json(
          { error: 'Verification token has expired. Please request a new one.' },
          { status: 400 }
        );
      }

      if (doctor.email_verified) {
        return NextResponse.json(
          { message: 'Email already verified', alreadyVerified: true },
          { status: 200 }
        );
      }

      // Mark as verified
      await supabaseAdmin
        .from('doctors')
        .update({
          email_verified: true,
          verification_token: null,
          verification_token_expires: null,
        })
        .eq('id', doctor.id);

      return NextResponse.json({
        success: true,
        message: 'Email verified successfully!',
      });
    }

    return NextResponse.json(
      { error: 'Invalid verification token' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Verify Email] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    );
  }
}
