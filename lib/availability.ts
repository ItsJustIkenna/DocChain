import { parseISO, getDay, format } from 'date-fns';

/**
 * Default doctor availability (9 AM - 5 PM, Monday-Friday)
 * In production, this would come from a database table
 */
const DEFAULT_AVAILABILITY = {
  monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  friday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  saturday: { enabled: false, slots: [] },
  sunday: { enabled: false, slots: [] },
};

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Check if a doctor is available at a given time
 */
export function isDoctorAvailable(appointmentTime: string | Date): boolean {
  const date = typeof appointmentTime === 'string' ? parseISO(appointmentTime) : appointmentTime;
  
  // Get day of week
  const dayIndex = getDay(date);
  const dayName = DAYS_OF_WEEK[dayIndex];
  
  // Check if day is enabled
  const daySchedule = DEFAULT_AVAILABILITY[dayName as keyof typeof DEFAULT_AVAILABILITY];
  if (!daySchedule || !daySchedule.enabled) {
    return false;
  }
  
  // Get time of appointment
  const appointmentTimeStr = format(date, 'HH:mm');
  
  // Check if time falls within any available slot
  for (const slot of daySchedule.slots) {
    if (appointmentTimeStr >= slot.start && appointmentTimeStr < slot.end) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check for conflicting appointments
 * Returns true if there's a conflict (time slot is taken)
 */
export async function hasAppointmentConflict(
  supabase: any,
  doctorId: string,
  appointmentTime: string,
  durationMinutes: number = 30,
  excludeAppointmentId?: string
): Promise<boolean> {
  const startTime = parseISO(appointmentTime);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
  
  // Check for overlapping appointments
  let query = supabase
    .from('appointments')
    .select('id, appointment_time, duration_minutes')
    .eq('doctor_id', doctorId)
    .neq('status', 'cancelled')
    .gte('appointment_time', startTime.toISOString())
    .lt('appointment_time', endTime.toISOString());
  
  if (excludeAppointmentId) {
    query = query.neq('id', excludeAppointmentId);
  }
  
  const { data: conflicts } = await query;
  
  return (conflicts && conflicts.length > 0) || false;
}

/**
 * Validate appointment time
 * Returns an error message if invalid, null if valid
 */
export async function validateAppointmentTime(
  supabase: any,
  doctorId: string,
  appointmentTime: string,
  durationMinutes: number = 30,
  excludeAppointmentId?: string
): Promise<string | null> {
  const date = parseISO(appointmentTime);
  
  // Check if in the past
  if (date <= new Date()) {
    return 'Cannot book appointments in the past';
  }
  
  // Check if too far in the future (e.g., more than 90 days)
  const maxFutureDate = new Date();
  maxFutureDate.setDate(maxFutureDate.getDate() + 90);
  if (date > maxFutureDate) {
    return 'Cannot book appointments more than 90 days in advance';
  }
  
  // Check doctor availability
  if (!isDoctorAvailable(date)) {
    const dayName = DAYS_OF_WEEK[getDay(date)];
    return `Doctor is not available on ${dayName}s at this time`;
  }
  
  // Check for conflicts
  const hasConflict = await hasAppointmentConflict(
    supabase,
    doctorId,
    appointmentTime,
    durationMinutes,
    excludeAppointmentId
  );
  
  if (hasConflict) {
    return 'This time slot is already booked';
  }
  
  return null; // Valid
}
