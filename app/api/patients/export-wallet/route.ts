import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { exportToSuiWalletFormat } from '@/lib/wallet';

/**
 * GET /api/patients/export-wallet?patientId=xxx
 * Export patient's custodial wallet private key
 * WARNING: This exposes the private key - only use over HTTPS in production
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

    // Get patient's encrypted private key
    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .select('sui_address, sui_private_key_encrypted')
      .eq('id', patientId)
      .single();

    if (error || !patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    if (!patient.sui_private_key_encrypted) {
      return NextResponse.json(
        { error: 'Wallet not found for this patient' },
        { status: 404 }
      );
    }

    // Decrypt and export private key
    const privateKey = exportToSuiWalletFormat(patient.sui_private_key_encrypted);

    return NextResponse.json({
      address: patient.sui_address,
      privateKey,
      warning: 'Keep this private key secure. Anyone with it can access your wallet.',
    });
  } catch (error) {
    console.error('Error exporting wallet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
