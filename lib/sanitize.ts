/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */

/**
 * Sanitize string input by removing potentially dangerous characters
 * Prevents XSS attacks by escaping HTML entities
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Sanitize email input
 * Basic validation and normalization
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  
  return email
    .toLowerCase()
    .trim()
    .replace(/[^\w\s@.\-+]/g, ''); // Allow alphanumeric, @, ., -, +
}

/**
 * Sanitize phone number
 * Remove non-numeric characters except + for country code
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') return '';
  
  return phone.replace(/[^\d+]/g, '').trim();
}

/**
 * Validate and sanitize UUID
 */
export function sanitizeUUID(uuid: string): string | null {
  if (typeof uuid !== 'string') return null;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const cleaned = uuid.trim().toLowerCase();
  
  return uuidRegex.test(cleaned) ? cleaned : null;
}

/**
 * Sanitize ISO date string
 */
export function sanitizeISODate(date: string): string | null {
  if (typeof date !== 'string') return null;
  
  try {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  } catch {
    return null;
  }
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: any, min?: number, max?: number): number | null {
  const num = Number(input);
  
  if (isNaN(num) || !isFinite(num)) return null;
  
  if (min !== undefined && num < min) return null;
  if (max !== undefined && num > max) return null;
  
  return num;
}

/**
 * Sanitize integer input
 */
export function sanitizeInteger(input: any, min?: number, max?: number): number | null {
  const num = sanitizeNumber(input, min, max);
  return num !== null ? Math.floor(num) : null;
}

/**
 * Sanitize medical notes/text content
 * More lenient than sanitizeString but still safe
 */
export function sanitizeMedicalText(text: string, maxLength: number = 10000): string {
  if (typeof text !== 'string') return '';
  
  // Remove potentially dangerous script tags
  let cleaned = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .trim();
  
  // Limit length
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }
  
  return cleaned;
}

/**
 * Validate and sanitize user input object
 * Returns sanitized object or null if validation fails
 */
export interface SanitizedUserInput {
  email?: string;
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
}

export function sanitizeUserInput(input: any): SanitizedUserInput | null {
  if (!input || typeof input !== 'object') return null;
  
  const sanitized: SanitizedUserInput = {};
  
  if (input.email) {
    const email = sanitizeEmail(input.email);
    if (email && isValidEmail(email)) {
      sanitized.email = email;
    }
  }
  
  if (input.fullName) {
    sanitized.fullName = sanitizeString(input.fullName);
  }
  
  if (input.phone) {
    sanitized.phone = sanitizePhone(input.phone);
  }
  
  if (input.dateOfBirth) {
    const date = sanitizeISODate(input.dateOfBirth);
    if (date) sanitized.dateOfBirth = date;
  }
  
  return sanitized;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate US phone number
 */
export function isValidUSPhone(phone: string): boolean {
  const phoneRegex = /^(\+1)?[\s.-]?\(?([0-9]{3})\)?[\s.-]?([0-9]{3})[\s.-]?([0-9]{4})$/;
  return phoneRegex.test(phone);
}

/**
 * Sanitize appointment booking data
 */
export interface SanitizedAppointmentData {
  doctorId: string;
  patientId?: string;
  appointmentTime: string;
  durationMinutes: number;
}

export function sanitizeAppointmentData(input: any): SanitizedAppointmentData | null {
  if (!input || typeof input !== 'object') return null;
  
  const doctorId = sanitizeUUID(input.doctor_id || input.doctorId);
  if (!doctorId) return null;
  
  const appointmentTime = sanitizeISODate(input.appointment_time || input.appointmentTime);
  if (!appointmentTime) return null;
  
  const durationMinutes = sanitizeInteger(input.duration_minutes || input.durationMinutes, 15, 240);
  if (!durationMinutes) return null;
  
  const sanitized: SanitizedAppointmentData = {
    doctorId,
    appointmentTime,
    durationMinutes,
  };
  
  if (input.patient_id || input.patientId) {
    const patientId = sanitizeUUID(input.patient_id || input.patientId);
    if (patientId) sanitized.patientId = patientId;
  }
  
  return sanitized;
}
