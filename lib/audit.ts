import { supabaseAdmin } from './supabase';
import { NextRequest } from 'next/server';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resourceType: 'appointment' | 'payment' | 'access_grant' | 'medical_record' | 'user' | 'admin_action' | 'video_session' | 'refund';
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure' | 'pending';
  errorMessage?: string;
}

/**
 * Log an audit event to the database
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: entry.userId || null,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId || null,
        details: entry.details || null,
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null,
        status: entry.status,
        error_message: entry.errorMessage || null,
      });

    if (error) {
      console.error('[Audit] Failed to log audit entry:', error);
    }
  } catch (error) {
    console.error('[Audit] Exception while logging:', error);
    // Don't throw - audit failures shouldn't break the application
  }
}

/**
 * Log audit event from a Next.js request
 */
export async function logAuditFromRequest(
  request: NextRequest,
  entry: Omit<AuditLogEntry, 'ipAddress' | 'userAgent'>
): Promise<void> {
  const ipAddress = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return logAudit({
    ...entry,
    ipAddress,
    userAgent,
  });
}

/**
 * Log payment processed
 */
export async function logPaymentProcessed(
  userId: string,
  appointmentId: string,
  amount: number,
  paymentIntentId: string,
  request?: NextRequest
): Promise<void> {
  const entry: AuditLogEntry = {
    userId,
    action: 'payment_processed',
    resourceType: 'payment',
    resourceId: appointmentId,
    details: {
      amount,
      payment_intent_id: paymentIntentId,
    },
    status: 'success',
  };

  if (request) {
    return logAuditFromRequest(request, entry);
  }
  return logAudit(entry);
}

/**
 * Log appointment booked
 */
export async function logAppointmentBooked(
  userId: string,
  appointmentId: string,
  doctorId: string,
  appointmentTime: string,
  request?: NextRequest
): Promise<void> {
  const entry: AuditLogEntry = {
    userId,
    action: 'appointment_booked',
    resourceType: 'appointment',
    resourceId: appointmentId,
    details: {
      doctor_id: doctorId,
      appointment_time: appointmentTime,
    },
    status: 'success',
  };

  if (request) {
    return logAuditFromRequest(request, entry);
  }
  return logAudit(entry);
}

/**
 * Log appointment cancelled
 */
export async function logAppointmentCancelled(
  userId: string,
  appointmentId: string,
  reason: string,
  refundAmount: number,
  request?: NextRequest
): Promise<void> {
  const entry: AuditLogEntry = {
    userId,
    action: 'appointment_cancelled',
    resourceType: 'appointment',
    resourceId: appointmentId,
    details: {
      reason,
      refund_amount: refundAmount,
    },
    status: 'success',
  };

  if (request) {
    return logAuditFromRequest(request, entry);
  }
  return logAudit(entry);
}

/**
 * Log medical record access
 */
export async function logMedicalRecordAccess(
  userId: string,
  recordId: string,
  patientId: string,
  accessType: 'view' | 'grant' | 'revoke',
  request?: NextRequest
): Promise<void> {
  const entry: AuditLogEntry = {
    userId,
    action: `medical_record_${accessType}`,
    resourceType: 'medical_record',
    resourceId: recordId,
    details: {
      patient_id: patientId,
      access_type: accessType,
    },
    status: 'success',
  };

  if (request) {
    return logAuditFromRequest(request, entry);
  }
  return logAudit(entry);
}

/**
 * Log admin action
 */
export async function logAdminAction(
  adminUserId: string,
  action: string,
  targetResourceType: string,
  targetResourceId: string,
  details: Record<string, any>,
  request?: NextRequest
): Promise<void> {
  const entry: AuditLogEntry = {
    userId: adminUserId,
    action: `admin_${action}`,
    resourceType: 'admin_action' as any,
    resourceId: targetResourceId,
    details: {
      target_resource_type: targetResourceType,
      ...details,
    },
    status: 'success',
  };

  if (request) {
    return logAuditFromRequest(request, entry);
  }
  return logAudit(entry);
}

/**
 * Log video session started
 */
export async function logVideoSessionStarted(
  userId: string,
  appointmentId: string,
  roomId: string,
  request?: NextRequest
): Promise<void> {
  const entry: AuditLogEntry = {
    userId,
    action: 'video_session_started',
    resourceType: 'video_session',
    resourceId: appointmentId,
    details: {
      room_id: roomId,
    },
    status: 'success',
  };

  if (request) {
    return logAuditFromRequest(request, entry);
  }
  return logAudit(entry);
}

/**
 * Log failed action for security monitoring
 */
export async function logFailedAction(
  action: string,
  resourceType: string,
  errorMessage: string,
  userId?: string,
  request?: NextRequest
): Promise<void> {
  const entry: AuditLogEntry = {
    userId,
    action: `${action}_failed`,
    resourceType: resourceType as any,
    status: 'failure',
    errorMessage,
  };

  if (request) {
    return logAuditFromRequest(request, entry);
  }
  return logAudit(entry);
}
