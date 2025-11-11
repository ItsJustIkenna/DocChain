import { NextRequest } from 'next/server';
import { getSession } from './auth';
import { supabaseAdmin } from './supabase';

export interface AdminAuthResult {
  isAdmin: boolean;
  userId?: string;
  error?: string;
}

/**
 * Verify that the request is from an authenticated admin user
 * Checks both JWT session and admin role in database
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  try {
    // First verify the session
    const session = await getSession(request);
    if (!session) {
      return { isAdmin: false, error: 'Unauthorized - no valid session' };
    }

    // Check if user has admin role in database
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('is_admin, user_type')
      .eq('id', session.userId)
      .single();

    if (error) {
      console.error('[Admin Auth] Database error:', error);
      return { isAdmin: false, error: 'Failed to verify admin status' };
    }

    if (!profile || !profile.is_admin) {
      return { isAdmin: false, userId: session.userId, error: 'Forbidden - admin access required' };
    }

    return { isAdmin: true, userId: session.userId };
  } catch (error: any) {
    console.error('[Admin Auth] Verification error:', error);
    return { isAdmin: false, error: 'Authentication failed' };
  }
}
