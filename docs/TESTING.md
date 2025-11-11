# DocChain Testing Guide

## 🔐 Default Test Password: `test123`

All test accounts use `test123` as the password for consistency.

---

## 👨‍⚕️ Pre-Seeded Doctor Accounts

These doctors are already in the database from seed data (`supabase/migrations/002_seed_data.sql`):

### Dr. Sarah Smith
- **Email**: `dr.sarah.smith@docchain.dev`
- **Password**: `test123`
- **Specialty**: Primary Care
- **NPI**: 1234567890
- **Rate**: $50/hour
- **Experience**: 12 years
- **Status**: ✅ Verified

### Dr. Michael Chen
- **Email**: `dr.michael.chen@docchain.dev`
- **Password**: `test123`
- **Specialty**: Pediatrics
- **NPI**: 2345678901
- **Rate**: $60/hour
- **Experience**: 8 years
- **Status**: ✅ Verified

### Dr. Emily Rodriguez
- **Email**: `dr.emily.rodriguez@docchain.dev`
- **Password**: `test123`
- **Specialty**: Dermatology
- **NPI**: 3456789012
- **Rate**: $80/hour
- **Experience**: 10 years
- **Status**: ✅ Verified

### Dr. James Wilson
- **Email**: `dr.james.wilson@docchain.dev`
- **Password**: `test123`
- **Specialty**: Mental Health
- **NPI**: 4567890123
- **Rate**: $70/hour
- **Experience**: 15 years
- **Status**: ✅ Verified

### Dr. Lisa Patel
- **Email**: `dr.lisa.patel@docchain.dev`
- **Password**: `test123`
- **Specialty**: Urgent Care
- **NPI**: 5678901234
- **Rate**: $65/hour
- **Experience**: 7 years
- **Status**: ✅ Verified

---

## 👤 Pre-Seeded Patient Accounts

### John Doe
- **Email**: `john.doe@test.com`
- **Password**: `test123`
- **DOB**: 1990-01-15

### Jane Smith
- **Email**: `jane.smith@test.com`
- **Password**: `test123`
- **DOB**: 1985-05-20

### Bob Johnson
- **Email**: `bob.johnson@test.com`
- **Password**: `test123`
- **DOB**: 1992-09-10

---

## 🧪 Test Doctor Registration Data

Use these to test the doctor onboarding flow at `/doctors/onboard`:

### New Doctor 1 - Primary Care
- **Full Name**: Dr. Sarah Smith
- **Email**: `dr.smith.new@example.com`
- **Specialty**: Primary Care
- **NPI Number**: `1234567890`
- **License Number**: MD12345
- **License State**: CA
- **Hourly Rate**: 60.00
- **Years Experience**: 10
- **Bio**: Board-certified family medicine physician with 10 years of experience.

### New Doctor 2 - Urgent Care
- **Full Name**: Dr. Michael Jones
- **Email**: `dr.jones.new@example.com`
- **Specialty**: Urgent Care
- **NPI Number**: `2345678901`
- **License Number**: MD23456
- **License State**: TX
- **Hourly Rate**: 50.00
- **Years Experience**: 8
- **Bio**: Emergency medicine specialist. Available for urgent consultations 7 days a week.

### New Doctor 3 - Mental Health
- **Full Name**: Dr. Priya Patel
- **Email**: `dr.patel.new@example.com`
- **Specialty**: Psychiatry
- **NPI Number**: `3456789012`
- **License Number**: PSY34567
- **License State**: NY
- **Hourly Rate**: 90.00
- **Years Experience**: 12
- **Bio**: Licensed clinical psychologist specializing in anxiety, depression, and stress management.

---

## 🧪 Testing Workflows

### 1. Test Patient Login & Booking
```
1. Login as john.doe@test.com / test123
2. Browse available doctors at /
3. View doctor profile
4. Book appointment (requires Sui wallet)
5. View appointment in dashboard
```

### 2. Test Doctor Login & Management
```
1. Login as dr.sarah.smith@docchain.dev / test123
2. Access doctor dashboard at /doctors/dashboard
3. View appointments
4. Join video consultation
5. Update profile
```

### 3. Test Doctor Onboarding
```
1. Go to /doctors/onboard
2. Use any "New Doctor" test data above
3. Fill in all required fields
4. Submit registration
5. Verify doctor appears in database
```

### 4. Test API Endpoints
```powershell
# Register new doctor via API
$body = @{
    email = "dr.test@example.com"
    full_name = "Dr. Test Doctor"
    specialty = "Primary Care"
    npi_number = "1234567890"
    license_number = "MD12345"
    license_state = "CA"
    hourly_rate = 60.00
    years_experience = 10
    bio = "Test doctor for API testing"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/doctors/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

---

## 🔒 Security Testing

### Rate Limiting
Test rate limits by making rapid requests:
- Auth endpoints: 5 requests/minute
- Booking endpoints: 10 requests/minute
- General API: 30 requests/minute

### Email Verification
Currently logs to console (Supabase handles actual verification in production).

### Admin Access
Test admin functions require `is_admin` flag in profiles table.

---

## 📝 Notes

- All test accounts share password `test123` for simplicity
- Seed data is automatically loaded from `002_seed_data.sql`
- Use different emails when testing registration to avoid conflicts
- Video consultations require Twilio credentials in `.env.local`
- Sui wallet interactions require testnet configuration
