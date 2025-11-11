import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendPasswordChangedEmail } from '@/lib/email';

/**
 * PUT /api/auth/change-password
 * Change password for authenticated user
 */
export async function PUT(request: Request) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error('Failed to change password:', updateError);
      return NextResponse.json(
        { error: 'Failed to change password' },
        { status: 500 }
      );
    }

    // Update last_password_changed in profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    await supabase
      .from('profiles')
      .update({ last_password_changed: new Date().toISOString() })
      .eq('id', user.id);

    // Send confirmation email
    if (profile) {
      await sendPasswordChangedEmail(user.email!, profile.full_name);
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
