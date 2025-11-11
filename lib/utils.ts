import { format, addMinutes, isAfter, isBefore, parseISO } from 'date-fns';

/**
 * Calculate refund amount based on cancellation policy
 * - 24+ hours notice: 100% refund
 * - <24 hours notice: No refund
 */
export function calculateRefund(
  priceUsd: number,
  appointmentTime: string,
  cancelledAt: Date = new Date()
): {
  refundAmount: number;
  refundPercentage: number;
  doctorAmount: number;
} {
  const appointmentDate = parseISO(appointmentTime);
  const hoursUntilAppointment = 
    (appointmentDate.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);

  let refundPercentage: number;

  if (hoursUntilAppointment >= 24) {
    // 24+ hours: 100% refund
    refundPercentage = 1.0;
  } else if (hoursUntilAppointment > 0) {
    // <24 hours: No refund
    refundPercentage = 0;
  } else {
    // Past appointment time: No refund
    refundPercentage = 0;
  }

  const refundAmount = Math.round(priceUsd * refundPercentage);
  const doctorAmount = priceUsd - refundAmount;

  return {
    refundAmount,
    refundPercentage,
    doctorAmount,
  };
}

/**
 * Generate time slots for a given day
 */
export function generateTimeSlots(
  startTime: string, // '09:00:00'
  endTime: string,   // '17:00:00'
  durationMinutes: number = 30
): string[] {
  const slots: string[] = [];
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  let current = new Date();
  current.setHours(startHour, startMinute, 0, 0);
  
  const end = new Date();
  end.setHours(endHour, endMinute, 0, 0);
  
  while (isBefore(current, end)) {
    slots.push(format(current, 'HH:mm:ss'));
    current = addMinutes(current, durationMinutes);
  }
  
  return slots;
}

/**
 * Format currency
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format date/time for display
 */
export function formatAppointmentTime(dateString: string): string {
  return format(parseISO(dateString), 'MMMM d, yyyy \'at\' h:mm a');
}

/**
 * Check if appointment is in the future
 */
export function isUpcoming(appointmentTime: string): boolean {
  return isAfter(parseISO(appointmentTime), new Date());
}

/**
 * Check if appointment is within 15 minutes
 */
export function canJoinVideo(appointmentTime: string): boolean {
  const now = new Date();
  const appointmentDate = parseISO(appointmentTime);
  const fifteenMinutesBefore = addMinutes(appointmentDate, -15);
  const thirtyMinutesAfter = addMinutes(appointmentDate, 30);
  
  return isAfter(now, fifteenMinutesBefore) && isBefore(now, thirtyMinutesAfter);
}

/**
 * Hash string (for license hashing)
 */
export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format (US)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
}

/**
 * Generate pagination metadata
 */
export function getPaginationMeta(
  total: number,
  page: number,
  pageSize: number
) {
  const totalPages = Math.ceil(total / pageSize);
  
  return {
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
