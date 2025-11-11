import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { claimAppointmentOnSui } from '@/lib/sui';

/**
 * POST /api/patients/claim-appointments
 * Claim past appointments on the blockchain
 * 
 * Expected body:
 * {
 *   patientId: string,
 *   appointmentIds: string[] // Optional: specific appointments to claim, or all if omitted
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { patientId, appointmentIds } = await request.json();

    if (!patientId) {
      return NextResponse.json(
        { error: 'Missing patientId' },
        { status: 400 }
      );
    }

    // Get patient's wallet address
    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('sui_address')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    if (!patient.sui_address) {
      return NextResponse.json(
        { error: 'Patient wallet not connected' },
        { status: 400 }
      );
    }

    // Get appointments to claim
    let query = supabaseAdmin
      .from('appointments')
      .select(`
        id,
        appointment_time,
        price_usd,
        sui_transaction_digest,
        doctor:doctors(sui_address)
      `)
      .eq('patient_id', patientId)
      .eq('status', 'confirmed')
      .not('sui_transaction_digest', 'is', null);

    if (appointmentIds && appointmentIds.length > 0) {
      query = query.in('id', appointmentIds);
    }

    const { data: appointments, error: apptError } = await query;

    if (apptError) {
      console.error('Error fetching appointments:', apptError);
      return NextResponse.json(
        { error: 'Failed to fetch appointments' },
        { status: 500 }
      );
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({
        claimed: 0,
        message: 'No appointments available to claim',
      });
    }

    // Claim each appointment on blockchain
    const results = [];
    for (const appointment of appointments) {
      try {
        console.log(`[Claim] Claiming appointment ${appointment.id}...`);
        
        // Extract doctor info (Supabase returns array for joins)
        const doctorInfo = Array.isArray(appointment.doctor) 
          ? appointment.doctor[0] 
          : appointment.doctor;
        
        const result = await claimAppointmentOnSui(
          appointment.id,
          patient.sui_address,
          doctorInfo.sui_address,
          new Date(appointment.appointment_time).getTime(),
          appointment.price_usd
        );

        results.push({
          appointmentId: appointment.id,
          success: true,
          transactionDigest: result.digest,
        });

        console.log(`[Claim] ✓ Appointment ${appointment.id} claimed: ${result.digest}`);
      } catch (error) {
        console.error(`[Claim] Failed to claim appointment ${appointment.id}:`, error);
        results.push({
          appointmentId: appointment.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      claimed: successCount,
      total: appointments.length,
      results,
    });
  } catch (error) {
    console.error('Error claiming appointments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/patients/claim-appointments?patientId=xxx
 * Get list of claimable appointments for a patient
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

    // Get patient's wallet status
    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('sui_address')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get confirmed appointments with blockchain records
    const { data: appointments, error: apptError } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        appointment_time,
        duration_minutes,
        price_usd,
        sui_transaction_digest,
        doctor:doctors(full_name, specialty, title_prefix, sui_address)
      `)
      .eq('patient_id', patientId)
      .eq('status', 'confirmed')
      .not('sui_transaction_digest', 'is', null)
      .order('appointment_time', { ascending: false });

    if (apptError) {
      console.error('Error fetching appointments:', apptError);
      return NextResponse.json(
        { error: 'Failed to fetch appointments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      walletConnected: !!patient.sui_address,
      suiAddress: patient.sui_address,
      appointments: appointments || [],
      claimable: appointments ? appointments.length : 0,
    });
  } catch (error) {
    console.error('Error fetching claimable appointments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
