-- ================================================================
-- DocChain - Complete Database Setup
-- Run this ONCE in Supabase SQL Editor to set up everything
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- MIGRATION 001: Initial Schema (if not already created)
-- ================================================================

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  license_number TEXT NOT NULL,
  license_state TEXT NOT NULL,
  npi_number TEXT UNIQUE NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  hourly_rate_usd INTEGER NOT NULL,
  stripe_account_id TEXT,
  sui_address TEXT,
  bio TEXT,
  photo_url TEXT,
  years_experience INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  sui_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  appointment_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pending',
  price_usd INTEGER NOT NULL,
  platform_fee_usd INTEGER NOT NULL,
  doctor_payout_usd INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_payout_id TEXT,
  sui_transaction_digest TEXT,
  sui_appointment_object_id TEXT,
  notes TEXT,
  video_room_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- MIGRATION 003-005: Add Sui blockchain columns
-- ================================================================

-- Add Sui columns to doctors table
ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS sui_doctor_profile_id TEXT;

-- Add transaction digest to appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS blockchain_tx_digest TEXT;

-- Add Sui address to patients (already exists in original schema)
-- ALTER TABLE patients ADD COLUMN IF NOT EXISTS sui_address TEXT;

-- ================================================================
-- MIGRATION 006: Add admin role to doctors
-- ================================================================

ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_doctors_is_admin ON doctors(is_admin) WHERE is_admin = true;

COMMENT ON COLUMN doctors.is_admin IS 'Whether this doctor has admin privileges';

-- ================================================================
-- MIGRATION 007: Add email verification
-- ================================================================

ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ;

ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_doctors_email_verification ON doctors(email_verification_token) WHERE email_verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_email_verification ON patients(email_verification_token) WHERE email_verification_token IS NOT NULL;

-- ================================================================
-- MIGRATION 008: Add appointment reminder tracking
-- ================================================================

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_reminder ON appointments(appointment_time, reminder_sent) 
WHERE reminder_sent = false AND status IN ('pending', 'confirmed');

-- ================================================================
-- MIGRATION 009: Add blockchain error tracking
-- ================================================================

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS blockchain_error TEXT,
ADD COLUMN IF NOT EXISTS blockchain_retry_count INTEGER DEFAULT 0;

-- ================================================================
-- MIGRATION 010: Create audit logs table
-- ================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  actor_id UUID,
  actor_type TEXT,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, actor_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

COMMENT ON TABLE audit_logs IS 'Audit trail for HIPAA compliance and security monitoring';

-- ================================================================
-- MIGRATION 011: Create medical records table
-- ================================================================

CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  record_type TEXT NOT NULL,
  title TEXT,
  description TEXT NOT NULL,
  encrypted_data TEXT,
  data_hash TEXT,
  sui_record_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor ON medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_appointment ON medical_records(appointment_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_type ON medical_records(record_type);

COMMENT ON TABLE medical_records IS 'Encrypted medical records with blockchain verification';

-- ================================================================
-- Enable Row Level Security (RLS)
-- ================================================================

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- RLS Policies (drop and recreate to avoid conflicts)
-- ================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Doctors can read own data" ON doctors;
DROP POLICY IF EXISTS "Patients can read own data" ON patients;
DROP POLICY IF EXISTS "Users can read own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can read relevant medical records" ON medical_records;

-- Doctors: Can read their own data
CREATE POLICY "Doctors can read own data" ON doctors
  FOR SELECT USING (id = current_setting('app.current_doctor_id', true)::uuid);

-- Patients: Can read their own data  
CREATE POLICY "Patients can read own data" ON patients
  FOR SELECT USING (id = current_setting('app.current_patient_id', true)::uuid);

-- Appointments: Patients/doctors can see their own appointments
CREATE POLICY "Users can read own appointments" ON appointments
  FOR SELECT USING (
    doctor_id = current_setting('app.current_doctor_id', true)::uuid OR
    patient_id = current_setting('app.current_patient_id', true)::uuid
  );

-- Medical records: Patients can read their own, doctors can read what they created
CREATE POLICY "Users can read relevant medical records" ON medical_records
  FOR SELECT USING (
    patient_id = current_setting('app.current_patient_id', true)::uuid OR
    doctor_id = current_setting('app.current_doctor_id', true)::uuid
  );

-- ================================================================
-- SUCCESS!
-- ================================================================

SELECT 
  'Database setup complete!' as status,
  COUNT(*) FILTER (WHERE table_name = 'doctors') as doctors_table,
  COUNT(*) FILTER (WHERE table_name = 'patients') as patients_table,
  COUNT(*) FILTER (WHERE table_name = 'appointments') as appointments_table,
  COUNT(*) FILTER (WHERE table_name = 'medical_records') as medical_records_table,
  COUNT(*) FILTER (WHERE table_name = 'audit_logs') as audit_logs_table
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('doctors', 'patients', 'appointments', 'medical_records', 'audit_logs');
