import crypto from 'crypto';

/**
 * Generate a random verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get verification token expiry time (24 hours from now)
 */
export function getVerificationTokenExpiry(): Date {
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 24);
  return expiryDate;
}

/**
 * Check if verification token is valid and not expired
 */
export function isVerificationTokenValid(expiresAt: string | Date): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiry > new Date();
}

/**
 * Send verification email (stub - integrate with email service)
 * TODO: Integrate with SendGrid, Mailgun, or AWS SES
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  fullName: string
): Promise<boolean> {
  try {
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
    
    console.log('='.repeat(80));
    console.log('EMAIL VERIFICATION');
    console.log('='.repeat(80));
    console.log(`To: ${email}`);
    console.log(`Name: ${fullName}`);
    console.log(`Verification URL: ${verificationUrl}`);
    console.log('='.repeat(80));
    console.log('');
    console.log('In production, integrate with an email service like:');
    console.log('- SendGrid (https://sendgrid.com/)');
    console.log('- Mailgun (https://www.mailgun.com/)');
    console.log('- AWS SES (https://aws.amazon.com/ses/)');
    console.log('='.repeat(80));

    // TODO: In production, actually send the email
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to: email,
    //   from: 'noreply@docchain.com',
    //   subject: 'Verify your DocChain email',
    //   html: `<p>Hi ${fullName},</p><p>Click here to verify: <a href="${verificationUrl}">${verificationUrl}</a></p>`
    // });

    return true;
  } catch (error) {
    console.error('[Email] Failed to send verification email:', error);
    return false;
  }
}

/**
 * Send appointment reminder email (stub)
 */
export async function sendAppointmentReminder(
  email: string,
  fullName: string,
  appointmentTime: string,
  doctorName: string
): Promise<boolean> {
  try {
    console.log('='.repeat(80));
    console.log('APPOINTMENT REMINDER');
    console.log('='.repeat(80));
    console.log(`To: ${email}`);
    console.log(`Patient: ${fullName}`);
    console.log(`Doctor: ${doctorName}`);
    console.log(`Time: ${appointmentTime}`);
    console.log('='.repeat(80));

    // TODO: In production, send actual email
    return true;
  } catch (error) {
    console.error('[Email] Failed to send reminder:', error);
    return false;
  }
}
