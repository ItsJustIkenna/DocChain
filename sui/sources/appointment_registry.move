module docchain::appointment_registry {
    use sui::object::UID;
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::event;
    use std::string::{Self as string, String};

    /// Immutable appointment record - patient owns this
    public struct AppointmentRecord has key, store {
        id: UID,
        appointment_id: String, // UUID from Supabase
        doctor_address: address,
        patient_address: address,
        appointment_timestamp: u64, // Unix timestamp
        price_usd_cents: u64,
        payment_confirmed: bool,
        created_at: u64,
    }

    /// Doctor profile - mutable, owned by doctor
    public struct DoctorProfile has key, store {
        id: UID,
        owner: address,
        doctor_id: String, // UUID from Supabase
        npi_number: String,
        license_hash: String, // SHA256 of license for verification
        specialty: String,
        is_verified: bool,
        total_appointments: u64,
        total_earnings_usd_cents: u64,
    }

    /// Admin capability - only admin can verify doctors
    public struct AdminCap has key, store { 
        id: UID 
    }

    /// Events
    public struct AppointmentRecorded has copy, drop {
        appointment_id: String,
        doctor: address,
        patient: address,
        timestamp: u64,
        price: u64,
    }

    public struct DoctorVerified has copy, drop {
        doctor: address,
        npi_number: String,
        specialty: String,
    }

    public struct AppointmentCancelled has copy, drop {
        appointment_id: String,
        cancelled_by: address,
        refund_amount_cents: u64,
    }

    public struct AppointmentClaimed has copy, drop {
        appointment_id: String,
        old_patient_address: address,
        new_patient_address: address,
        claimed_at: u64,
    }

    /// Initialize module - transfer admin capability to deployer
    fun init(ctx: &mut TxContext) {
        transfer::transfer(
            AdminCap { id: object::new(ctx) },
            tx_context::sender(ctx)
        );
    }

    /// Register doctor - admin only
    public entry fun register_doctor(
        _admin: &AdminCap,
        doctor_address: address,
        doctor_id: vector<u8>,
        npi_number: vector<u8>,
        license_hash: vector<u8>,
        specialty: vector<u8>,
        ctx: &mut TxContext
    ) {
        let profile = DoctorProfile {
            id: object::new(ctx),
            owner: doctor_address,
            doctor_id: string::utf8(doctor_id),
            npi_number: string::utf8(npi_number),
            license_hash: string::utf8(license_hash),
            specialty: string::utf8(specialty),
            is_verified: true,
            total_appointments: 0,
            total_earnings_usd_cents: 0,
        };

        event::emit(DoctorVerified {
            doctor: doctor_address,
            npi_number: string::utf8(npi_number),
            specialty: string::utf8(specialty),
        });

        transfer::transfer(profile, doctor_address);
    }

    /// Record appointment - called by backend after Stripe payment succeeds
    /// Patient receives the AppointmentRecord as proof
    public entry fun record_appointment(
        doctor_profile: &mut DoctorProfile,
        appointment_id: vector<u8>,
        patient_address: address,
        appointment_timestamp: u64,
        price_usd_cents: u64,
        ctx: &mut TxContext
    ) {
        // Only verified doctors can have appointments recorded
        assert!(doctor_profile.is_verified, 0);

        let record = AppointmentRecord {
            id: object::new(ctx),
            appointment_id: string::utf8(appointment_id),
            doctor_address: doctor_profile.owner,
            patient_address,
            appointment_timestamp,
            price_usd_cents,
            payment_confirmed: true,
            created_at: tx_context::epoch_timestamp_ms(ctx),
        };

        // Update doctor stats
        doctor_profile.total_appointments = doctor_profile.total_appointments + 1;
        doctor_profile.total_earnings_usd_cents = 
            doctor_profile.total_earnings_usd_cents + price_usd_cents;

        event::emit(AppointmentRecorded {
            appointment_id: string::utf8(appointment_id),
            doctor: doctor_profile.owner,
            patient: patient_address,
            timestamp: appointment_timestamp,
            price: price_usd_cents,
        });

        // Transfer record to patient - they own their health records
        transfer::transfer(record, patient_address);
    }

    /// Record appointment by admin - for MVP, simplified version that emits event
    /// without requiring doctor's signature
    public entry fun record_appointment_by_admin(
        _admin: &AdminCap,
        doctor_address: address,
        appointment_id: vector<u8>,
        patient_address: address,
        appointment_timestamp: u64,
        price_usd_cents: u64,
        _ctx: &mut TxContext
    ) {
        event::emit(AppointmentRecorded {
            appointment_id: string::utf8(appointment_id),
            doctor: doctor_address,
            patient: patient_address,
            timestamp: appointment_timestamp,
            price: price_usd_cents,
        });
    }

    /// Record cancellation - emits event for audit trail
    public entry fun record_cancellation(
        appointment_id: vector<u8>,
        refund_amount_cents: u64,
        ctx: &mut TxContext
    ) {
        event::emit(AppointmentCancelled {
            appointment_id: string::utf8(appointment_id),
            cancelled_by: tx_context::sender(ctx),
            refund_amount_cents,
        });
    }

    /// Claim appointment - allows patient with connected wallet to claim past appointments
    /// recorded with placeholder address (0x0)
    /// Only admin can execute this to prevent unauthorized claiming
    public entry fun claim_appointment(
        _admin: &AdminCap,
        appointment_id: vector<u8>,
        old_patient_address: address, // Should be 0x0 for unclaimed appointments
        new_patient_address: address, // Patient's actual wallet address
        doctor_address: address,
        appointment_timestamp: u64,
        price_usd_cents: u64,
        ctx: &mut TxContext
    ) {
        // Verify old address is placeholder (0x0)
        assert!(old_patient_address == @0x0, 1);

        event::emit(AppointmentClaimed {
            appointment_id: string::utf8(appointment_id),
            old_patient_address,
            new_patient_address,
            claimed_at: tx_context::epoch_timestamp_ms(ctx),
        });

        // Re-emit appointment with new patient address
        event::emit(AppointmentRecorded {
            appointment_id: string::utf8(appointment_id),
            doctor: doctor_address,
            patient: new_patient_address,
            timestamp: appointment_timestamp,
            price: price_usd_cents,
        });
    }

    /// Query functions for frontend

    public fun get_appointment_details(record: &AppointmentRecord): (String, address, address, u64, u64, u64) {
        (
            record.appointment_id,
            record.doctor_address,
            record.patient_address,
            record.appointment_timestamp,
            record.price_usd_cents,
            record.created_at
        )
    }

    public fun get_doctor_stats(profile: &DoctorProfile): (String, String, bool, u64, u64) {
        (
            profile.npi_number,
            profile.specialty,
            profile.is_verified,
            profile.total_appointments,
            profile.total_earnings_usd_cents
        )
    }

    public fun is_doctor_verified(profile: &DoctorProfile): bool {
        profile.is_verified
    }

    #[test_only]
    /// Test-only function to create admin cap
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
