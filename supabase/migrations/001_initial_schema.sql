-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Doctors table
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  license_number TEXT NOT NULL,
  license_state TEXT NOT NULL,
  npi_number TEXT UNIQUE NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  hourly_rate_usd INTEGER NOT NULL, -- in cents
  stripe_account_id TEXT,
  sui_address TEXT,
  bio TEXT,
  photo_url TEXT,
  years_experience INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients table
CREATE TABLE patients (
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
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  appointment_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pending', 
  -- Status: pending, confirmed, completed, cancelled, no_show
  price_usd INTEGER NOT NULL, -- in cents
  platform_fee_usd INTEGER NOT NULL, -- in cents
  doctor_payout_usd INTEGER NOT NULL, -- in cents
  stripe_payment_intent_id TEXT,
  stripe_payout_id TEXT,
  sui_transaction_digest TEXT,
  video_room_id TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, appointment_time)
);

-- Doctor availability slots (simple version for MVP)
CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification requests (for manual review)
CREATE TABLE verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  npi_number TEXT NOT NULL,
  license_photo_url TEXT,
  nppes_data JSONB, -- Store NPPES API response
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_time ON appointments(appointment_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_doctors_verified ON doctors(is_verified);
CREATE INDEX idx_doctors_specialty ON doctors(specialty);
CREATE INDEX idx_availability_doctor ON availability_slots(doctor_id);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- Doctors: can read all, update own
CREATE POLICY "Doctors viewable by all" ON doctors FOR SELECT USING (true);
CREATE POLICY "Doctors can update own profile" ON doctors FOR UPDATE 
  USING (auth.uid()::text = id::text);

-- Patients: can read own, update own
CREATE POLICY "Patients can view own data" ON patients FOR SELECT 
  USING (auth.uid()::text = id::text);
CREATE POLICY "Patients can update own data" ON patients FOR UPDATE 
  USING (auth.uid()::text = id::text);

-- Appointments: doctors and patients can view own
CREATE POLICY "Users can view own appointments" ON appointments FOR SELECT 
  USING (
    auth.uid()::text = doctor_id::text OR 
    auth.uid()::text = patient_id::text
  );

-- Availability: viewable by all, doctors can manage own
CREATE POLICY "Availability viewable by all" ON availability_slots FOR SELECT USING (true);
CREATE POLICY "Doctors can manage own availability" ON availability_slots FOR ALL 
  USING (auth.uid()::text = doctor_id::text);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
