import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Ed25519PublicKey } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';

/**
 * POST /api/patients/connect-wallet
 * Verify wallet ownership and save Sui address to patient profile
 * 
 * Expected body:
 * {
 *   patientId: string,
 *   suiAddress: string,
 *   signature: string, // Base64 encoded signature
 *   message: string     // Message that was signed
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { patientId, suiAddress, signature, message } = await request.json();

    if (!patientId || !suiAddress || !signature || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the signature was created by the wallet address
    try {
      const publicKey = new Ed25519PublicKey(suiAddress);
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = fromB64(signature);
      
      const isValid = await publicKey.verify(messageBytes, signatureBytes);
      
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } catch (verifyError) {
      console.error('Signature verification error:', verifyError);
      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 401 }
      );
    }

    // Update patient with their Sui address
    const { data: patient, error: updateError } = await supabaseAdmin
      .from('patients')
      .update({ sui_address: suiAddress })
      .eq('id', patientId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating patient:', updateError);
      return NextResponse.json(
        { error: 'Failed to save wallet address' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      patient,
    });
  } catch (error) {
    console.error('Error connecting wallet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/patients/connect-wallet?patientId=xxx
 * Get patient's wallet connection status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json(
        { error: 'Missing patientId' },
        { status: 400 }
      );
    }

    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .select('id, sui_address')
      .eq('id', patientId)
      .single();

    if (error || !patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      connected: !!patient.sui_address,
      suiAddress: patient.sui_address,
    });
  } catch (error) {
    console.error('Error checking wallet status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
