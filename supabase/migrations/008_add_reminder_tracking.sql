-- Add reminder tracking fields to appointments table
-- Run this in Supabase SQL Editor

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_appointments_reminders 
ON appointments(status, appointment_time, reminder_24h_sent, reminder_1h_sent)
WHERE status = 'confirmed';

COMMENT ON COLUMN appointments.reminder_24h_sent IS 'Whether 24-hour reminder email has been sent';
COMMENT ON COLUMN appointments.reminder_1h_sent IS 'Whether 1-hour reminder email has been sent';
