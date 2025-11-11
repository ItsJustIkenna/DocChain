import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { registerDoctorOnSui } from '@/lib/sui';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

/**
 * POST /api/doctors/register-blockchain
 * Register a doctor on the Sui blockchain
 */
export async function POST(request: NextRequest) {
  try {
    const { doctorId } = await request.json();
    
    console.log('[Register Blockchain] Starting registration for doctor:', doctorId);

    if (!doctorId) {
      return NextResponse.json(
        { error: 'Doctor ID required' },
        { status: 400 }
      );
    }

    // Get doctor details
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .eq('id', doctorId)
      .single();

    if (doctorError || !doctor) {
      console.error('[Register Blockchain] Doctor not found:', doctorError);
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // Generate a Sui keypair for the doctor (in production, doctor would provide their own)
    console.log('[Register Blockchain] Generating Sui keypair for doctor...');
    const keypair = new Ed25519Keypair();
    const doctorAddress = keypair.getPublicKey().toSuiAddress();
    
    console.log('[Register Blockchain] Doctor address:', doctorAddress);

    // Register on blockchain
    console.log('[Register Blockchain] Calling registerDoctorOnSui...');
    const result = await registerDoctorOnSui(
      doctorAddress,
      doctor.id,
      doctor.npi_number || 'UNKNOWN',
      `license_${doctor.license_number || 'UNKNOWN'}`, // Simple license hash
      doctor.specialty || 'General Practice'
    );

    console.log('[Register Blockchain] Registration successful!');
    console.log('[Register Blockchain] Transaction digest:', result.digest);
    
    // Extract DoctorProfile object ID from transaction
    const createdObject = result.objectChanges?.find(
      (change: any) => change.type === 'created' && change.objectType?.includes('DoctorProfile')
    );
    const doctorProfileId = createdObject ? (createdObject as any).objectId : undefined;

    console.log('[Register Blockchain] DoctorProfile ID:', doctorProfileId);

    // Update doctor record with Sui info
    const { error: updateError } = await supabaseAdmin
      .from('doctors')
      .update({
        sui_address: doctorAddress,
        sui_doctor_profile_id: doctorProfileId,
        updated_at: new Date().toISOString()
      })
      .eq('id', doctorId);

    if (updateError) {
      console.error('[Register Blockchain] Failed to update doctor:', updateError);
      throw updateError;
    }

    console.log('[Register Blockchain] ✓ Doctor registered on blockchain successfully');

    return NextResponse.json({
      success: true,
      doctorAddress,
      doctorProfileId,
      transactionDigest: result.digest,
      explorerUrl: `https://suiexplorer.com/txblock/${result.digest}?network=devnet`
    });

  } catch (error) {
    console.error('[Register Blockchain] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to register doctor on blockchain',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/doctors/register-blockchain
 * Register all unregistered doctors on blockchain
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Register Blockchain] Fetching unregistered doctors...');
    
    // Get all doctors without sui_address
    const { data: doctors, error } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .is('sui_address', null);

    if (error) {
      throw error;
    }

    console.log(`[Register Blockchain] Found ${doctors?.length || 0} unregistered doctors`);

    const results = [];

    for (const doctor of doctors || []) {
      try {
        console.log(`[Register Blockchain] Registering doctor: ${doctor.full_name}`);
        
        // Generate keypair
        const keypair = new Ed25519Keypair();
        const doctorAddress = keypair.getPublicKey().toSuiAddress();

        // Register on blockchain
        const result = await registerDoctorOnSui(
          doctorAddress,
          doctor.id,
          doctor.npi_number || 'UNKNOWN',
          `license_${doctor.license_number || 'UNKNOWN'}`,
          doctor.specialty || 'General Practice'
        );

        // Extract DoctorProfile object ID
        const createdObject2 = result.objectChanges?.find(
          (change: any) => change.type === 'created' && change.objectType?.includes('DoctorProfile')
        );
        const doctorProfileId = createdObject2 ? (createdObject2 as any).objectId : undefined;

        // Update doctor record
        const { data: updateData, error: updateError } = await supabaseAdmin
          .from('doctors')
          .update({
            sui_address: doctorAddress,
            sui_doctor_profile_id: doctorProfileId,
            updated_at: new Date().toISOString()
          })
          .eq('id', doctor.id);

        if (updateError) {
          console.error(`[Register Blockchain] ⚠️ Database update failed:`, updateError);
          throw new Error(`Database update failed: ${updateError.message}`);
        }
        
        console.log(`[Register Blockchain] ✓ Database updated for ${doctor.full_name}`);

        results.push({
          doctorId: doctor.id,
          doctorName: doctor.full_name,
          success: true,
          address: doctorAddress,
          profileId: doctorProfileId,
          transactionDigest: result.digest
        });

        console.log(`[Register Blockchain] ✓ ${doctor.full_name} registered successfully`);

      } catch (err) {
        console.error(`[Register Blockchain] ✗ Failed to register ${doctor.full_name}:`, err);
        results.push({
          doctorId: doctor.id,
          doctorName: doctor.full_name,
          success: false,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }

    return NextResponse.json({
      message: 'Batch registration complete',
      results
    });

  } catch (error) {
    console.error('[Register Blockchain] Batch registration error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to register doctors',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
