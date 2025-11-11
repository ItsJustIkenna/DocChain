-- Migration: Password Reset Tokens
-- Description: Add password reset functionality with secure token management
-- Created: 2024

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT token_not_expired CHECK (expires_at > created_at)
);

-- Index for fast token lookups
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Function to clean up expired tokens (run periodically)
CREATE OR REPLACE FUNCTION clean_expired_password_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add last_password_changed column to profiles for security
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_password_changed TIMESTAMPTZ DEFAULT NOW();

-- Comment on table
COMMENT ON TABLE password_reset_tokens IS 'Secure storage for password reset tokens with expiration';
COMMENT ON COLUMN password_reset_tokens.token IS 'SHA-256 hashed reset token';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration time (typically 1 hour)';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Timestamp when token was used (prevents reuse)';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON password_reset_tokens TO authenticated;
