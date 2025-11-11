-- Add blockchain error tracking fields to appointments table
-- Run this in Supabase SQL Editor

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS blockchain_recording_failed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS blockchain_error_message TEXT,
ADD COLUMN IF NOT EXISTS blockchain_error_at TIMESTAMPTZ;

-- Add cancellation tracking fields
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS refund_amount INTEGER,
ADD COLUMN IF NOT EXISTS refund_percentage INTEGER;

CREATE INDEX IF NOT EXISTS idx_appointments_blockchain_failed 
ON appointments(blockchain_recording_failed)
WHERE blockchain_recording_failed = true;

COMMENT ON COLUMN appointments.blockchain_recording_failed IS 'Whether blockchain recording failed for this appointment';
COMMENT ON COLUMN appointments.blockchain_error_message IS 'Error message if blockchain recording failed';
COMMENT ON COLUMN appointments.blockchain_error_at IS 'When blockchain recording failed';
COMMENT ON COLUMN appointments.cancelled_at IS 'When the appointment was cancelled';
COMMENT ON COLUMN appointments.cancelled_by IS 'User ID who cancelled the appointment';
COMMENT ON COLUMN appointments.cancellation_reason IS 'Reason provided for cancellation';
COMMENT ON COLUMN appointments.refund_amount IS 'Refund amount in cents';
COMMENT ON COLUMN appointments.refund_percentage IS 'Refund percentage (0-100)';
