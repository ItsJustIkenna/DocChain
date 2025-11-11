-- Add Sui custodial wallet columns to patients table
-- DocChain manages the wallet, patient can export later
ALTER TABLE patients ADD COLUMN IF NOT EXISTS sui_address TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS sui_private_key_encrypted TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_patients_sui_address ON patients(sui_address);

-- Add comments
COMMENT ON COLUMN patients.sui_address IS 'Custodial Sui wallet address managed by DocChain';
COMMENT ON COLUMN patients.sui_private_key_encrypted IS 'Encrypted private key - patient can export to external wallet';
