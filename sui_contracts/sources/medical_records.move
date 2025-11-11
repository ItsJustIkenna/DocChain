// Medical Records Smart Contract for Sui Blockchain
// Stores encrypted medical record hashes with access control

module docchain::medical_records {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::string::{Self, String};
    use std::vector;

    // ==================== Structs ====================

    /// Represents a medical record stored on-chain
    struct MedicalRecord has key, store {
        id: UID,
        patient_address: address,      // Patient's wallet address
        doctor_address: address,       // Doctor who created the record
        appointment_id: String,        // Reference to appointment
        record_hash: String,           // SHA-256 hash of encrypted medical data
        record_type: String,           // consultation_note, prescription, lab_result, etc.
        ipfs_cid: String,             // IPFS Content ID for encrypted file storage
        created_at: u64,              // Timestamp
        is_active: bool,              // Can be revoked by patient
    }

    /// Access control list for a medical record
    struct AccessGrant has key, store {
        id: UID,
        record_id: address,           // ID of the medical record
        granted_to: address,          // Doctor/provider given access
        granted_by: address,          // Patient who granted access
        expires_at: u64,              // Expiration timestamp (0 = never)
        can_read: bool,
        can_write: bool,
    }

    /// Patient's medical record registry
    struct PatientRegistry has key {
        id: UID,
        patient_address: address,
        record_ids: vector<address>,  // List of all record IDs
        total_records: u64,
    }

    // ==================== Events ====================

    struct RecordCreated has copy, drop {
        record_id: address,
        patient_address: address,
        doctor_address: address,
        record_type: String,
        timestamp: u64,
    }

    struct AccessGranted has copy, drop {
        record_id: address,
        granted_to: address,
        granted_by: address,
        expires_at: u64,
    }

    struct AccessRevoked has copy, drop {
        record_id: address,
        revoked_from: address,
    }

    // ==================== Public Functions ====================

    /// Create a new medical record (called by doctor after appointment)
    public entry fun create_medical_record(
        patient_address: address,
        appointment_id: vector<u8>,
        record_hash: vector<u8>,
        record_type: vector<u8>,
        ipfs_cid: vector<u8>,
        ctx: &mut TxContext
    ) {
        let doctor_address = tx_context::sender(ctx);
        let timestamp = tx_context::epoch(ctx);

        let record = MedicalRecord {
            id: object::new(ctx),
            patient_address,
            doctor_address,
            appointment_id: string::utf8(appointment_id),
            record_hash: string::utf8(record_hash),
            record_type: string::utf8(record_type),
            ipfs_cid: string::utf8(ipfs_cid),
            created_at: timestamp,
            is_active: true,
        };

        let record_id = object::uid_to_address(&record.id);

        event::emit(RecordCreated {
            record_id,
            patient_address,
            doctor_address,
            record_type: record.record_type,
            timestamp,
        });

        // Transfer ownership to patient
        transfer::transfer(record, patient_address);
    }

    /// Grant access to a doctor/provider for a specific record
    public entry fun grant_access(
        record: &MedicalRecord,
        granted_to: address,
        expires_at: u64,
        can_read: bool,
        can_write: bool,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Only patient can grant access
        assert!(sender == record.patient_address, 1);
        assert!(record.is_active, 2);

        let access_grant = AccessGrant {
            id: object::new(ctx),
            record_id: object::uid_to_address(&record.id),
            granted_to,
            granted_by: sender,
            expires_at,
            can_read,
            can_write,
        };

        event::emit(AccessGranted {
            record_id: object::uid_to_address(&record.id),
            granted_to,
            granted_by: sender,
            expires_at,
        });

        transfer::transfer(access_grant, granted_to);
    }

    /// Revoke a medical record (patient only)
    public entry fun revoke_record(
        record: &mut MedicalRecord,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == record.patient_address, 1);
        
        record.is_active = false;
    }

    /// Update record hash (for amendments by original doctor)
    public entry fun update_record_hash(
        record: &mut MedicalRecord,
        new_hash: vector<u8>,
        new_ipfs_cid: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Only original doctor can update
        assert!(sender == record.doctor_address, 1);
        assert!(record.is_active, 2);

        record.record_hash = string::utf8(new_hash);
        record.ipfs_cid = string::utf8(new_ipfs_cid);
    }

    // ==================== Getter Functions ====================

    public fun get_record_hash(record: &MedicalRecord): String {
        record.record_hash
    }

    public fun get_ipfs_cid(record: &MedicalRecord): String {
        record.ipfs_cid
    }

    public fun is_record_active(record: &MedicalRecord): bool {
        record.is_active
    }

    public fun get_patient_address(record: &MedicalRecord): address {
        record.patient_address
    }

    public fun get_doctor_address(record: &MedicalRecord): address {
        record.doctor_address
    }

    public fun can_access(
        access_grant: &AccessGrant,
        current_time: u64
    ): bool {
        if (access_grant.expires_at == 0) {
            return true
        };
        current_time < access_grant.expires_at
    }
}
