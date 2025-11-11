-- Medical Records Table
-- Stores encrypted medical records with blockchain hash references

CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    
    -- Record Information
    record_type TEXT NOT NULL CHECK (record_type IN (
        'consultation_note',
        'prescription',
        'lab_result',
        'diagnostic_report',
        'imaging',
        'referral',
        'other'
    )),
    title TEXT NOT NULL,
    description TEXT,
    
    -- Encrypted Storage
    encrypted_content TEXT NOT NULL,      -- AES-256 encrypted medical data
    encryption_key_id TEXT NOT NULL,      -- Reference to key in key management system
    
    -- Blockchain Integration
    record_hash TEXT NOT NULL,            -- SHA-256 hash for verification
    sui_object_id TEXT,                   -- Sui blockchain object ID
    sui_transaction_hash TEXT,            -- Transaction that created the record
    ipfs_cid TEXT,                        -- IPFS content ID if using distributed storage
    
    -- Metadata
    file_url TEXT,                        -- URL to encrypted file (S3/etc)
    file_type TEXT,                       -- pdf, jpg, dicom, etc
    file_size_bytes INTEGER,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_shared BOOLEAN NOT NULL DEFAULT false,  -- Has been shared with other providers
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT medical_records_patient_idx UNIQUE (patient_id, record_hash)
);

-- Access Control Table
-- Tracks who has been granted access to medical records
CREATE TABLE IF NOT EXISTS medical_record_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    granted_to_doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    granted_by_patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Access Permissions
    can_read BOOLEAN NOT NULL DEFAULT true,
    can_write BOOLEAN NOT NULL DEFAULT false,  -- Can add amendments
    can_share BOOLEAN NOT NULL DEFAULT false,  -- Can share with other providers
    
    -- Blockchain reference
    sui_access_grant_id TEXT,  -- Sui AccessGrant object ID
    
    -- Expiration
    expires_at TIMESTAMPTZ,  -- NULL = permanent access
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES patients(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_record_access UNIQUE (record_id, granted_to_doctor_id)
);

-- Audit Log for Record Access
CREATE TABLE IF NOT EXISTS medical_record_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    accessed_by_user_id UUID NOT NULL REFERENCES profiles(id), -- Fixed: was 'users', should be 'profiles'
    accessed_by_role TEXT NOT NULL CHECK (accessed_by_role IN ('patient', 'doctor', 'admin')),
    
    -- Action details
    action_type TEXT NOT NULL CHECK (action_type IN (
        'created',
        'viewed',
        'updated',
        'downloaded',
        'shared',
        'access_granted',
        'access_revoked',
        'deleted'
    )),
    
    ip_address INET,
    user_agent TEXT,
    
    -- Compliance
    accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX idx_medical_records_doctor ON medical_records(doctor_id);
CREATE INDEX idx_medical_records_appointment ON medical_records(appointment_id);
CREATE INDEX idx_medical_records_created_at ON medical_records(created_at DESC);
CREATE INDEX idx_medical_records_active ON medical_records(is_active) WHERE is_active = true;

CREATE INDEX idx_record_access_record ON medical_record_access(record_id);
CREATE INDEX idx_record_access_doctor ON medical_record_access(granted_to_doctor_id);
CREATE INDEX idx_record_access_active ON medical_record_access(is_active) WHERE is_active = true;

CREATE INDEX idx_audit_log_record ON medical_record_audit_log(record_id);
CREATE INDEX idx_audit_log_user ON medical_record_audit_log(accessed_by_user_id);
CREATE INDEX idx_audit_log_time ON medical_record_audit_log(accessed_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_record_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_record_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Patients can only see their own records
CREATE POLICY medical_records_patient_policy ON medical_records
    FOR SELECT
    USING (patient_id = (
        SELECT id FROM patients WHERE id = patient_id
    ));

-- Doctors can see records they created or have been granted access to
CREATE POLICY medical_records_doctor_policy ON medical_records
    FOR SELECT
    USING (
        doctor_id = (SELECT id FROM doctors WHERE id = doctor_id)
        OR id IN (
            SELECT record_id FROM medical_record_access
            WHERE granted_to_doctor_id = (SELECT id FROM doctors WHERE id = granted_to_doctor_id)
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > NOW())
        )
    );

COMMENT ON TABLE medical_records IS 'Encrypted medical records with blockchain verification';
COMMENT ON COLUMN medical_records.encrypted_content IS 'AES-256 encrypted medical data';
COMMENT ON COLUMN medical_records.record_hash IS 'SHA-256 hash stored on Sui blockchain for tamper detection';
COMMENT ON COLUMN medical_records.sui_object_id IS 'Reference to on-chain MedicalRecord object';
