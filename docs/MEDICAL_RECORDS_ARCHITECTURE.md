# Medical Records Blockchain Architecture

## Overview
DocChain implements a **hybrid blockchain architecture** for medical records that combines the security of encryption, the immutability of blockchain, and HIPAA compliance.

## Architecture Design

### 1. **Three-Layer Approach**

```
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                     │
│  (Patient/Doctor Interface, Access Control UI)          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   DATABASE LAYER                         │
│  ┌─────────────────────────────────────────────┐        │
│  │  Encrypted Medical Records (AES-256)        │        │
│  │  - Consultation notes                        │        │
│  │  - Prescriptions                             │        │
│  │  - Lab results                               │        │
│  │  - Medical images                            │        │
│  └─────────────────────────────────────────────┘        │
│                                                           │
│  ┌─────────────────────────────────────────────┐        │
│  │  Access Control Lists                        │        │
│  │  - Who can read                              │        │
│  │  - Who can write                             │        │
│  │  - Expiration dates                          │        │
│  └─────────────────────────────────────────────┘        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 BLOCKCHAIN LAYER (Sui)                   │
│  ┌─────────────────────────────────────────────┐        │
│  │  Medical Record Hashes (SHA-256)            │        │
│  │  - Tamper detection                          │        │
│  │  - Audit trail                               │        │
│  │  - Immutable timestamps                      │        │
│  └─────────────────────────────────────────────┘        │
│                                                           │
│  ┌─────────────────────────────────────────────┐        │
│  │  Access Grants (Smart Contract)             │        │
│  │  - Patient-controlled permissions            │        │
│  │  - Verifiable on-chain                       │        │
│  │  - Cannot be forged                          │        │
│  └─────────────────────────────────────────────┘        │
└───────────────────────────────────────────────────────────┘
```

### 2. **Data Flow**

#### Creating a Medical Record:
```
1. Doctor creates consultation note after appointment
2. System encrypts data with AES-256 (patient-specific key)
3. Generate SHA-256 hash of encrypted data
4. Store encrypted data in database
5. Upload encrypted file to IPFS (optional)
6. Create MedicalRecord on Sui blockchain with hash
7. Emit RecordCreated event on-chain
8. Transfer ownership to patient's wallet
```

#### Accessing a Medical Record:
```
1. Requesting doctor needs access
2. Patient reviews request in UI
3. Patient grants access via smart contract
4. AccessGrant created on-chain with expiration
5. Doctor can now decrypt and view record
6. All access logged in audit trail
7. Patient can revoke access anytime
```

## Smart Contract Functions

### Core Functions

```move
// Create new medical record (doctor only)
public entry fun create_medical_record(
    patient_address: address,
    appointment_id: vector<u8>,
    record_hash: vector<u8>,
    record_type: vector<u8>,
    ipfs_cid: vector<u8>,
    ctx: &mut TxContext
)

// Grant access to a provider (patient only)
public entry fun grant_access(
    record: &MedicalRecord,
    granted_to: address,
    expires_at: u64,
    can_read: bool,
    can_write: bool,
    ctx: &mut TxContext
)

// Revoke a record (patient only)
public entry fun revoke_record(
    record: &mut MedicalRecord,
    ctx: &mut TxContext
)
```

## Security Features

### 1. **Encryption**
- **Algorithm**: AES-256-GCM
- **Key Management**: Per-patient keys stored in secure vault
- **Rotation**: Keys can be rotated without re-encrypting (envelope encryption)

### 2. **Blockchain Verification**
- **Hash Algorithm**: SHA-256
- **Purpose**: Detect any tampering with medical data
- **Process**: 
  1. Before displaying record, recalculate hash
  2. Compare with on-chain hash
  3. Alert if mismatch (tampering detected)

### 3. **Access Control**
- **Patient-Owned**: Patients control who sees their data
- **Time-Limited**: Access can expire automatically
- **Revocable**: Patient can revoke access instantly
- **Auditable**: All access attempts logged

### 4. **HIPAA Compliance**
- ✅ Encrypted at rest (database)
- ✅ Encrypted in transit (HTTPS/TLS)
- ✅ Access controls
- ✅ Audit logging
- ✅ Patient rights (access, portability, deletion)
- ✅ No PHI on public blockchain

## Database Schema

### Tables

#### `medical_records`
```sql
- id: UUID
- patient_id: FK
- doctor_id: FK
- appointment_id: FK
- record_type: enum (consultation_note, prescription, lab_result, etc.)
- encrypted_content: TEXT (AES-256 encrypted)
- record_hash: TEXT (SHA-256 for blockchain)
- sui_object_id: TEXT (blockchain reference)
- ipfs_cid: TEXT (distributed storage)
- is_active: BOOLEAN
- created_at: TIMESTAMP
```

#### `medical_record_access`
```sql
- id: UUID
- record_id: FK
- granted_to_doctor_id: FK
- can_read, can_write, can_share: BOOLEAN
- expires_at: TIMESTAMP (NULL = permanent)
- sui_access_grant_id: TEXT
- is_active: BOOLEAN
```

#### `medical_record_audit_log`
```sql
- id: UUID
- record_id: FK
- accessed_by_user_id: FK
- action_type: enum (viewed, downloaded, shared, etc.)
- ip_address, user_agent: TEXT
- accessed_at: TIMESTAMP
```

## Implementation Steps

### Phase 1: Basic Storage ✅
- [x] Database schema
- [x] Sui smart contract
- [x] Encryption utilities

### Phase 2: Doctor Interface
- [ ] API endpoint to create medical records
- [ ] Form for doctors to add consultation notes
- [ ] Automatic record creation after appointments

### Phase 3: Patient Access
- [ ] Medical records page for patients
- [ ] View own records
- [ ] Download records as PDF

### Phase 4: Access Control
- [ ] UI for patients to grant/revoke access
- [ ] Doctor requests access feature
- [ ] Notification system

### Phase 5: Blockchain Integration
- [ ] Deploy smart contract to Sui testnet
- [ ] Integrate Sui SDK
- [ ] Create records on-chain
- [ ] Verify hashes

## API Endpoints

### For Doctors
```
POST   /api/medical-records          - Create new record
GET    /api/medical-records/:id      - View record (if has access)
PATCH  /api/medical-records/:id      - Update record
POST   /api/medical-records/:id/request-access  - Request access
```

### For Patients
```
GET    /api/patients/medical-records - List all patient's records
GET    /api/medical-records/:id      - View specific record
POST   /api/medical-records/:id/grant-access    - Grant access to doctor
POST   /api/medical-records/:id/revoke-access   - Revoke doctor's access
GET    /api/medical-records/:id/audit-log       - View access history
DELETE /api/medical-records/:id      - Soft delete record
```

## Benefits

### For Patients
- ✅ Full control over medical data
- ✅ Easy to share with new doctors
- ✅ Cannot be altered without detection
- ✅ Portable medical history
- ✅ Privacy preserved

### For Doctors
- ✅ Access to complete patient history
- ✅ Cannot be accused of data tampering
- ✅ Easy collaboration with specialists
- ✅ Reduced liability

### For Healthcare System
- ✅ Reduced medical errors
- ✅ Better care coordination
- ✅ HIPAA compliant
- ✅ Fraud prevention
- ✅ Research opportunities (anonymized data)

## Future Enhancements

1. **AI Integration**: Use GPT-4 to summarize medical history
2. **HL7 FHIR**: Standard healthcare data format
3. **IoT Integration**: Import data from wearables
4. **Emergency Access**: Override mechanism for life-threatening situations
5. **Family Sharing**: Parents access children's records
6. **Research Consent**: Opt-in to share anonymized data
7. **Multi-chain**: Support Ethereum, Polygon for wider adoption

## Cost Analysis

### Blockchain Transaction Costs
- Create MedicalRecord: ~0.001 SUI (~$0.0001)
- Grant Access: ~0.0005 SUI (~$0.00005)
- Revoke Access: ~0.0003 SUI (~$0.00003)

**Total per appointment**: <$0.001 in blockchain fees

### Storage Costs
- Database: $0.10/GB/month (PostgreSQL)
- IPFS: $0.03/GB/month (decentralized)
- Encryption/Decryption: Negligible (CPU time)

## Compliance & Legal

### HIPAA Requirements Met
- ✅ Administrative safeguards
- ✅ Physical safeguards (encrypted storage)
- ✅ Technical safeguards (access controls, audit logs)
- ✅ Breach notification capabilities

### GDPR Requirements Met
- ✅ Right to access
- ✅ Right to erasure (soft delete + blockchain revocation)
- ✅ Right to portability (export as JSON/PDF)
- ✅ Right to be informed (audit logs)

## Testing Strategy

1. **Unit Tests**: Smart contract functions
2. **Integration Tests**: Database + Blockchain sync
3. **Security Tests**: Penetration testing, encryption validation
4. **Performance Tests**: Hash verification under load
5. **Compliance Tests**: HIPAA audit simulation

## Monitoring & Alerts

- Hash mismatch detection (tamper alert)
- Unusual access patterns (security alert)
- Failed encryption/decryption (system alert)
- Blockchain transaction failures (retry mechanism)
- Storage quota exceeded (scale alert)

---

**Status**: Architecture complete, implementation in progress
**Last Updated**: November 10, 2025
**Version**: 1.0
