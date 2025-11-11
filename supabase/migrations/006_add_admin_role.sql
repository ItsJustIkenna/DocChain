-- Add is_admin field to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- To manually set a user as admin, run:
-- UPDATE profiles SET is_admin = true WHERE email = 'your-admin-email@example.com';

COMMENT ON COLUMN profiles.is_admin IS 'Whether this user has admin privileges for the platform';
