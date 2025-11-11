import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * POST /api/admin/verify-doctor
 * Approve or reject a doctor's verification
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const auth = await verifyAdminAuth(request);
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { doctorId, approve } = body;

    console.log('[Admin API] Verifying doctor:', { doctorId, approve });

    if (!doctorId || typeof approve !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: doctorId, approve' },
        { status: 400 }
      );
    }

    // Update doctor verification status
    const { data: doctor, error } = await supabaseAdmin
      .from('doctors')
      .update({
        is_verified: approve,
        updated_at: new Date().toISOString(),
      })
      .eq('id', doctorId)
      .select()
      .single();

    console.log('[Admin API] Update result:', { doctor, error });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      doctor,
      message: approve
        ? 'Doctor verified successfully'
        : 'Doctor verification revoked',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
