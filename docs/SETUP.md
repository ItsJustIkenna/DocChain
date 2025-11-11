# DocChain Setup Instructions

## ✅ Completed Steps
1. ✅ Sui CLI installed in WSL2
2. ✅ Smart contract deployed to Sui devnet
3. ✅ npm dependencies installed
4. ✅ Environment variables configured

## 🔧 Next Steps

### 1. Set Up Database (2 minutes)

1. Open your Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/vetiasftzjihrnqqmcfc/sql/new
   ```

2. Copy the contents of `setup-database.sql` and paste it into the SQL editor

3. Click "Run" to create all tables, indexes, and RLS policies

### 2. Add Test Data (Optional)

After running the schema, you can run the seed data:
```sql
-- Copy from supabase/migrations/002_seed_data.sql
```

This will add 5 test doctors with various specialties.

### 3. Start Development Server

```powershell
npm run dev
```

Your app will be available at: http://localhost:3000

### 4. Start Stripe Webhook Listener (In a separate terminal)

```powershell
C:\stripe\stripe.exe listen --forward-to localhost:3000/api/webhooks/stripe
```

## 🧪 Testing the MVP

### Test Doctor Registration
```powershell
# Test NPI: 1234567890 (will auto-verify in dev)
curl -X POST http://localhost:3000/api/doctors -H "Content-Type: application/json" -d '{
  "email": "doctor@test.com",
  "full_name": "Dr. Test",
  "specialty": "General Practice",
  "license_number": "MD123456",
  "license_state": "CA",
  "npi_number": "1234567890",
  "hourly_rate_usd": 15000
}'
```

### Test Patient Booking Flow
1. Go to http://localhost:3000
2. Browse available doctors
3. Select a doctor and time slot
4. Book appointment
5. Use test card: `4242 4242 4242 4242`
6. Complete payment

## 🔍 Monitoring

- **Supabase Dashboard**: https://supabase.com/dashboard/project/vetiasftzjihrnqqmcfc
- **Stripe Dashboard**: https://dashboard.stripe.com/test/payments
- **Sui Explorer**: https://devnet.suivision.xyz/package/0x5fb8ea304afa06e8f784a7ac03e1c0b135b66e652732380c6d3033651ba2459c

## 📋 Key Information

### Sui Blockchain
- Network: Devnet
- Package ID: `0x5fb8ea304afa06e8f784a7ac03e1c0b135b66e652732380c6d3033651ba2459c`
- Admin Address: `0xb6b784d8ca0b2e77033e31dcb8f661d7a7165146a24ba770e1760e75c8caddf4`
- AdminCap ID: `0x209cf0bc42bd0a5b0a43479038ea41e6f7c40795bb9b2fe480bf951e81551046`

### Stripe
- Mode: Test
- Webhook Secret: Configured in `.env.local`
- Platform Fee: 12% (scales to 8% at 201+ appointments)

### Supabase
- Project: vetiasftzjihrnqqmcfc
- Region: Already configured
- Auth: Configured with service role key

## 🎯 Mission
Build a blockchain-based healthcare marketplace that is:
- **72% cheaper** than traditional healthcare
- **95% faster** than traditional booking
- **100% transparent** with immutable records

## 🚀 Next Features (Post-MVP)
- Email notifications
- Doctor dashboard UI
- Patient medical history
- Prescription management
- Insurance integration (future)
- Mobile app

---

**Need help?** Check DEPLOYMENT.md for detailed troubleshooting.
