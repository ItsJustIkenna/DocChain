-- Add Sui transaction digest column to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS sui_transaction_digest TEXT;

-- Add comment
COMMENT ON COLUMN appointments.sui_transaction_digest IS 'Sui blockchain transaction hash for this appointment';
