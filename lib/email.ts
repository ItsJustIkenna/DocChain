/**
 * Email Service for DocChain
 * Supports: SendGrid, Mailgun, and Console (dev mode)
 */

import crypto from 'crypto';

// Configuration
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'console';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@docchain.health';
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL || 'noreply@docchain.health';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

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

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email via SendGrid
 */
async function sendWithSendGrid(options: EmailOptions): Promise<void> {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured');
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: options.to }] }],
      from: { email: SENDGRID_FROM_EMAIL },
      subject: options.subject,
      content: [
        { type: 'text/html', value: options.html },
        ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid error: ${error}`);
  }
}

/**
 * Send email via Mailgun
 */
async function sendWithMailgun(options: EmailOptions): Promise<void> {
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    throw new Error('MAILGUN_API_KEY or MAILGUN_DOMAIN not configured');
  }

  const formData = new URLSearchParams();
  formData.append('from', MAILGUN_FROM_EMAIL);
  formData.append('to', options.to);
  formData.append('subject', options.subject);
  formData.append('html', options.html);
  if (options.text) {
    formData.append('text', options.text);
  }

  const response = await fetch(
    `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mailgun error: ${error}`);
  }
}

/**
 * Main email sending function
 */
async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    if (EMAIL_PROVIDER === 'sendgrid') {
      await sendWithSendGrid(options);
      console.log(`📧 Email sent via SendGrid to ${options.to}: ${options.subject}`);
    } else if (EMAIL_PROVIDER === 'mailgun') {
      await sendWithMailgun(options);
      console.log(`📧 Email sent via Mailgun to ${options.to}: ${options.subject}`);
    } else {
      // Development mode - log to console
      console.log('📧 [DEV MODE] Email:', {
        to: options.to,
        subject: options.subject,
        preview: options.html.substring(0, 150) + '...',
      });
    }
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    // Don't throw - we don't want email failures to break the app
  }
}

/**
 * Email template wrapper
 */
function emailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DocChain</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f7fafc; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .content { padding: 40px 30px; }
    .button { display: inline-block; background: #667eea; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
    .button:hover { background: #5568d3; }
    .footer { background: #f7fafc; padding: 30px; text-align: center; color: #718096; font-size: 14px; border-top: 1px solid #e2e8f0; }
    .info-box { background: #edf2f7; border-left: 4px solid #667eea; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .blockchain-badge { background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%); color: white; padding: 8px 16px; border-radius: 6px; display: inline-block; font-size: 13px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>© ${new Date().getFullYear()} DocChain. All rights reserved.</p>
      <p style="margin-top: 10px; font-size: 12px;">
        <a href="${APP_URL}" style="color: #667eea; text-decoration: none;">Visit DocChain</a> •
        <a href="${APP_URL}/help" style="color: #667eea; text-decoration: none;">Help Center</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send verification email to new user
 */
export async function sendVerificationEmail(email: string, token: string, fullName?: string): Promise<boolean> {
  try {
    const verificationUrl = `${APP_URL}/api/auth/verify-email?token=${token}`;
    
    const content = `
      <div class="header">
        <h1>🎉 Welcome to DocChain!</h1>
      </div>
      <div class="content">
        <p>Hi ${fullName || 'there'}!</p>
        <p>Thank you for signing up for DocChain, the future of healthcare powered by blockchain technology.</p>
        <p>Please verify your email address to activate your account:</p>
        <div style="text-align: center;">
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
        </div>
        <div class="info-box">
          <p style="margin: 0;"><strong>This link expires in 24 hours.</strong></p>
          <p style="margin: 8px 0 0 0; font-size: 14px;">If you didn't create this account, you can safely ignore this email.</p>
        </div>
        <p style="margin-top: 30px; font-size: 14px; color: #718096;">
          Can't click the button? Copy and paste this URL into your browser:<br>
          <span style="color: #667eea; word-break: break-all;">${verificationUrl}</span>
        </p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'Verify your DocChain account',
      html: emailTemplate(content),
      text: `Welcome to DocChain! Verify your email: ${verificationUrl}`,
    });

    return true;
  } catch (error) {
    console.error('[Email] Failed to send verification email:', error);
    return false;
  }
}

/**
 * Send appointment confirmation email
 */
export async function sendAppointmentConfirmation(params: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  appointmentDate: Date;
  appointmentType: string;
  suiTransactionDigest?: string;
}): Promise<boolean> {
  try {
    const { patientEmail, patientName, doctorName, appointmentDate, appointmentType, suiTransactionDigest } = params;
    
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const content = `
      <div class="header">
        <h1>✅ Appointment Confirmed</h1>
      </div>
      <div class="content">
        <p>Hi ${patientName},</p>
        <p>Your appointment with <strong>Dr. ${doctorName}</strong> has been confirmed!</p>
        
        <div class="info-box">
          <p style="margin: 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
          <p style="margin: 8px 0 0 0;"><strong>⏰ Time:</strong> ${formattedTime}</p>
          <p style="margin: 8px 0 0 0;"><strong>🏥 Type:</strong> ${appointmentType}</p>
        </div>

        ${suiTransactionDigest ? `
        <div style="margin: 30px 0;">
          <p><strong>🔒 Blockchain Verification</strong></p>
          <div class="blockchain-badge">
            ⛓️ Immutable Record Created
          </div>
          <p style="font-size: 14px; color: #718096; margin-top: 10px;">
            Your appointment has been permanently recorded on the Sui blockchain for security and transparency.
            <br>
            <a href="https://suiscan.xyz/mainnet/tx/${suiTransactionDigest}" style="color: #7c3aed;">View Transaction</a>
          </p>
        </div>
        ` : ''}

        <div style="text-align: center; margin-top: 30px;">
          <a href="${APP_URL}/appointments" class="button">View Appointment Details</a>
        </div>

        <div class="info-box" style="margin-top: 30px;">
          <p style="margin: 0; font-size: 14px;"><strong>📝 Before your appointment:</strong></p>
          <ul style="margin: 10px 0 0 20px; padding: 0; font-size: 14px;">
            <li>Prepare any questions or concerns you have</li>
            <li>Have your medical history ready</li>
            <li>Test your internet connection (for video appointments)</li>
          </ul>
        </div>

        <p style="margin-top: 30px; font-size: 14px; color: #718096;">
          Need to reschedule? Visit your dashboard or contact support.
        </p>
      </div>
    `;

    await sendEmail({
      to: patientEmail,
      subject: `Appointment Confirmed - Dr. ${doctorName}`,
      html: emailTemplate(content),
      text: `Your appointment with Dr. ${doctorName} is confirmed for ${formattedDate} at ${formattedTime}`,
    });

    return true;
  } catch (error) {
    console.error('[Email] Failed to send appointment confirmation:', error);
    return false;
  }
}

/**
 * Send appointment reminder email (24 hours before)
 */
export async function sendAppointmentReminder(
  email: string,
  fullName: string,
  appointmentTime: string,
  doctorName: string
): Promise<boolean>;
export async function sendAppointmentReminder(params: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  appointmentDate: Date;
  appointmentId: string;
}): Promise<boolean>;
export async function sendAppointmentReminder(
  emailOrParams: string | {
    patientEmail: string;
    patientName: string;
    doctorName: string;
    appointmentDate: Date;
    appointmentId: string;
  },
  fullName?: string,
  appointmentTime?: string,
  doctorName?: string
): Promise<boolean> {
  try {
    // Handle both old and new signatures
    let patientEmail: string;
    let patientName: string;
    let doctor: string;
    let appointmentDate: Date;
    let appointmentId: string;

    if (typeof emailOrParams === 'string') {
      // Old signature
      patientEmail = emailOrParams;
      patientName = fullName!;
      doctor = doctorName!;
      appointmentDate = new Date(appointmentTime!);
      appointmentId = '';
    } else {
      // New signature
      patientEmail = emailOrParams.patientEmail;
      patientName = emailOrParams.patientName;
      doctor = emailOrParams.doctorName;
      appointmentDate = emailOrParams.appointmentDate;
      appointmentId = emailOrParams.appointmentId;
    }
    
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const content = `
      <div class="header">
        <h1>⏰ Appointment Reminder</h1>
      </div>
      <div class="content">
        <p>Hi ${patientName},</p>
        <p>This is a friendly reminder about your upcoming appointment:</p>
        
        <div class="info-box">
          <p style="margin: 0;"><strong>👨‍⚕️ Doctor:</strong> Dr. ${doctor}</p>
          <p style="margin: 8px 0 0 0;"><strong>📅 Tomorrow:</strong> ${formattedDate}</p>
          <p style="margin: 8px 0 0 0;"><strong>⏰ Time:</strong> ${formattedTime}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/appointments${appointmentId ? `/${appointmentId}` : ''}" class="button">View Appointment</a>
        </div>

        <div class="info-box">
          <p style="margin: 0; font-size: 14px;"><strong>✅ Preparation checklist:</strong></p>
          <ul style="margin: 10px 0 0 20px; padding: 0; font-size: 14px;">
            <li>Review your medical history and symptoms</li>
            <li>Prepare your questions</li>
            <li>Test your video connection 10 minutes early</li>
            <li>Have any necessary documents ready</li>
          </ul>
        </div>

        <p style="margin-top: 30px; font-size: 14px; color: #718096;">
          If you need to reschedule, please do so at least 4 hours before the appointment time to avoid cancellation fees.
        </p>
      </div>
    `;

    await sendEmail({
      to: patientEmail,
      subject: `Reminder: Appointment tomorrow with Dr. ${doctor}`,
      html: emailTemplate(content),
      text: `Reminder: Your appointment with Dr. ${doctor} is tomorrow at ${formattedTime}`,
    });

    return true;
  } catch (error) {
    console.error('[Email] Failed to send reminder:', error);
    return false;
  }
}

/**
 * Send appointment cancellation notification
 */
export async function sendAppointmentCancellation(params: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  appointmentDate: Date;
  cancelledBy: 'patient' | 'doctor';
  refundAmount?: number;
}): Promise<boolean> {
  try {
    const { patientEmail, patientName, doctorName, appointmentDate, cancelledBy, refundAmount } = params;
    
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const content = `
      <div class="header">
        <h1>❌ Appointment Cancelled</h1>
      </div>
      <div class="content">
        <p>Hi ${patientName},</p>
        <p>Your appointment with <strong>Dr. ${doctorName}</strong> has been cancelled.</p>
        
        <div class="info-box">
          <p style="margin: 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
          <p style="margin: 8px 0 0 0;"><strong>⏰ Time:</strong> ${formattedTime}</p>
          <p style="margin: 8px 0 0 0;"><strong>🔄 Cancelled by:</strong> ${cancelledBy === 'patient' ? 'You' : 'Doctor'}</p>
        </div>

        ${refundAmount !== undefined && refundAmount > 0 ? `
        <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0;"><strong>💰 Refund Issued:</strong> $${refundAmount.toFixed(2)}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px;">Your refund will be processed within 5-7 business days.</p>
        </div>
        ` : refundAmount === 0 ? `
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px;">Due to the late cancellation, no refund is available per our cancellation policy.</p>
        </div>
        ` : ''}

        <div style="text-align: center; margin-top: 30px;">
          <a href="${APP_URL}/doctors/browse" class="button">Book Another Appointment</a>
        </div>

        ${cancelledBy === 'doctor' ? `
        <p style="margin-top: 30px; font-size: 14px; color: #718096;">
          We apologize for any inconvenience. You can book with another available doctor or reschedule with Dr. ${doctorName}.
        </p>
        ` : ''}
      </div>
    `;

    await sendEmail({
      to: patientEmail,
      subject: `Appointment Cancelled - Dr. ${doctorName}`,
      html: emailTemplate(content),
      text: `Your appointment with Dr. ${doctorName} on ${formattedDate} has been cancelled.`,
    });

    return true;
  } catch (error) {
    console.error('[Email] Failed to send cancellation notification:', error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  try {
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    
    const content = `
      <div class="header">
        <h1>🔐 Password Reset Request</h1>
      </div>
      <div class="content">
        <p>Hi there,</p>
        <p>We received a request to reset your password for your DocChain account.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" class="button">Reset Password</a>
        </div>

        <div class="info-box">
          <p style="margin: 0;"><strong>⏱️ This link expires in 1 hour.</strong></p>
          <p style="margin: 8px 0 0 0; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
        </div>

        <p style="margin-top: 30px; font-size: 14px; color: #718096;">
          Can't click the button? Copy and paste this URL into your browser:<br>
          <span style="color: #667eea; word-break: break-all;">${resetUrl}</span>
        </p>

        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 30px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px;"><strong>🔒 Security Tip:</strong></p>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: #991b1b;">Never share your password reset link with anyone. DocChain will never ask for your password via email.</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'Reset your DocChain password',
      html: emailTemplate(content),
      text: `Reset your password: ${resetUrl}`,
    });

    return true;
  } catch (error) {
    console.error('[Email] Failed to send password reset email:', error);
    return false;
  }
}

/**
 * Send password changed confirmation email
 */
export async function sendPasswordChangedEmail(email: string, userName: string): Promise<boolean> {
  try {
    const content = `
      <div class="header">
        <h1>✅ Password Changed</h1>
      </div>
      <div class="content">
        <p>Hi ${userName},</p>
        <p>Your DocChain account password has been successfully changed.</p>
        
        <div class="info-box">
          <p style="margin: 0;"><strong>🕐 Time:</strong> ${new Date().toLocaleString('en-US')}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px;">If you made this change, no further action is needed.</p>
        </div>

        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 30px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px;"><strong>⚠️ Didn't change your password?</strong></p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #991b1b;">
            If you didn't make this change, please contact our support team immediately at support@docchain.health
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${APP_URL}/login" class="button">Login to Your Account</a>
        </div>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'Your DocChain password has been changed',
      html: emailTemplate(content),
      text: `Your DocChain password was changed at ${new Date().toLocaleString('en-US')}`,
    });

    return true;
  } catch (error) {
    console.error('[Email] Failed to send password changed email:', error);
    return false;
  }
}

/**
 * Send appointment rescheduled notification email
 */
export async function sendAppointmentRescheduled(params: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  oldDate: Date;
  newDate: Date;
  appointmentType: string;
  refundAmount?: number;
}): Promise<boolean> {
  try {
    const { patientEmail, patientName, doctorName, oldDate, newDate, appointmentType, refundAmount } = params;
    
    const formattedOldDate = oldDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedOldTime = oldDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const formattedNewDate = newDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedNewTime = newDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const content = `
      <div class="header">
        <h1>🔄 Appointment Rescheduled</h1>
      </div>
      <div class="content">
        <p>Hi ${patientName},</p>
        <p>Your appointment with <strong>Dr. ${doctorName}</strong> has been rescheduled.</p>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px;"><strong>❌ Previous Appointment (Cancelled):</strong></p>
          <p style="margin: 8px 0 0 0; font-size: 14px;">
            ${formattedOldDate} at ${formattedOldTime}
          </p>
        </div>

        <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px;"><strong>✅ New Appointment:</strong></p>
          <p style="margin: 8px 0 0 0; font-size: 14px;">
            <strong>Date:</strong> ${formattedNewDate}
          </p>
          <p style="margin: 8px 0 0 0; font-size: 14px;">
            <strong>Time:</strong> ${formattedNewTime}
          </p>
          <p style="margin: 8px 0 0 0; font-size: 14px;">
            <strong>Type:</strong> ${appointmentType}
          </p>
        </div>

        ${refundAmount !== undefined && refundAmount > 0 ? `
        <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0;"><strong>💰 Refund Issued:</strong> $${refundAmount.toFixed(2)}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px;">Your refund will be processed within 5-7 business days.</p>
        </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/appointments" class="button">View Appointment Details</a>
        </div>

        <div class="info-box" style="margin-top: 30px;">
          <p style="margin: 0; font-size: 14px;"><strong>📝 Before your appointment:</strong></p>
          <ul style="margin: 10px 0 0 20px; padding: 0; font-size: 14px;">
            <li>Prepare any questions or concerns you have</li>
            <li>Have your medical history ready</li>
            <li>Test your internet connection (for video appointments)</li>
          </ul>
        </div>

        <p style="margin-top: 30px; font-size: 14px; color: #718096;">
          You'll receive a reminder 24 hours before your new appointment.
        </p>
      </div>
    `;

    await sendEmail({
      to: patientEmail,
      subject: `Appointment Rescheduled - Dr. ${doctorName}`,
      html: emailTemplate(content),
      text: `Your appointment with Dr. ${doctorName} has been rescheduled from ${formattedOldDate} at ${formattedOldTime} to ${formattedNewDate} at ${formattedNewTime}`,
    });

    return true;
  } catch (error) {
    console.error('[Email] Failed to send rescheduled notification:', error);
    return false;
  }
}

