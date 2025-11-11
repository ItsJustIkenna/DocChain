-- Add Sui blockchain columns to doctors table
ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS sui_doctor_profile_id TEXT;

-- Add comment
COMMENT ON COLUMN doctors.sui_doctor_profile_id IS 'Sui blockchain DoctorProfile object ID';
