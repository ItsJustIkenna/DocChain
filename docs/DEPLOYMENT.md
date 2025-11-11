# DocChain Deployment Guide

## Prerequisites

Before deploying, ensure you have:
- Node.js 18+ installed
- npm or yarn package manager
- Git
- Supabase account
- Stripe account (with Connect enabled)
- Twilio account (optional, for video)
- Sui CLI installed (`cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet sui`)

## 1. Initial Setup

### Clone and Install

```bash
cd DocChain
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your keys:

```bash
cp .env.local.example .env.local
```

## 2. Supabase Setup

### Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy project URL and anon key to `.env.local`

### Run Migrations

1. Open Supabase SQL Editor
2. Run `supabase/migrations/001_initial_schema.sql`
3. Run `supabase/migrations/002_seed_data.sql` (optional test data)

### Get Service Role Key

1. In Supabase Dashboard → Settings → API
2. Copy "service_role" key (keep secret!)
3. Add to `.env.local`

## 3. Stripe Setup

### Create Account

1. Sign up at [stripe.com](https://stripe.com)
2. Get API keys from Dashboard → Developers → API keys
3. Add to `.env.local`

### Enable Stripe Connect

1. Dashboard → Connect → Get Started
2. Choose "Platform" type
3. Complete onboarding form

### Create Webhook

**For Local Development (Testing):**

1. Install Stripe CLI:
```powershell
# Download from https://github.com/stripe/stripe-cli/releases/latest
# Extract and add to PATH, or use scoop:
scoop install stripe
```

2. Login to Stripe:
```powershell
stripe login
```

3. Forward webhooks to your local server:
```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

4. Copy the webhook signing secret from the output (starts with `whsec_...`)
5. Add to `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

6. Keep the `stripe listen` terminal running while developing!

7. Test with:
```powershell
stripe trigger payment_intent.succeeded
```

**For Production:**

1. Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Add endpoint URL: `https://yourdomain.vercel.app/api/webhooks/stripe`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
5. Copy webhook signing secret to your production environment variables

## 4. Sui Blockchain Setup

### Install Sui CLI

```bash
# macOS/Linux
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet sui

# Verify installation
sui --version
```

### Create Wallet

```bash
# Generate new wallet
sui client new-address ed25519

# Switch to devnet
sui client switch --env devnet

# Get devnet tokens (faucet)
sui client faucet
```

### Deploy Smart Contract

```bash
# Build the contract
cd sui
sui move build

# Deploy to devnet
sui client publish --gas-budget 100000000

# Note the outputs:
# - Package ID (starts with 0x...)
# - AdminCap object ID
# Add these to .env.local
```

### Save Keys

```bash
# Get your private key
sui keytool list

# Add to .env.local as SUI_PRIVATE_KEY
```

## 5. Twilio Setup (Optional for Video)

### Create Account

1. Sign up at [twilio.com](https://twilio.com)
2. Go to Console → Account → API Keys & Tokens
3. Create new API key
4. Add SID and Secret to `.env.local`

### Enable Video

1. Console → Video → Get Started
2. Enable Peer-to-Peer rooms (free for 2 participants)

## 6. Local Development

### Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

### Test the Flow

1. **Register a doctor**:
   - Go to `/doctor/onboard`
   - Use test NPI: `1234567890` (from seed data)
   - Complete Stripe Connect onboarding

2. **Book an appointment** (as patient):
   - Go to `/browse`
   - Select a doctor
   - Book time slot
   - Use Stripe test card: `4242 4242 4242 4242`

3. **Check blockchain**:
   - After payment, check Sui Explorer
   - View transaction at `https://suiscan.xyz/devnet/tx/{digest}`

## 7. Production Deployment (Vercel)

### Install Vercel CLI

```bash
npm i -g vercel
```

### Deploy

```bash
# Login
vercel login

# Deploy
vercel --prod

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# ... add all env vars from .env.local

# Redeploy with env vars
vercel --prod
```

### Update Webhook URLs

1. **Stripe**: Update webhook URL to `https://yourdomain.vercel.app/api/webhooks/stripe`
2. **Twilio**: Update status callback to `https://yourdomain.vercel.app/api/webhooks/twilio`

### Deploy to Sui Mainnet (when ready)

```bash
# Switch to mainnet
sui client switch --env mainnet

# Get mainnet SUI (buy on exchange)

# Deploy
cd sui
sui client publish --gas-budget 100000000

# Update .env with mainnet package ID
```

## 8. Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Test doctor registration with real NPI
- [ ] Test appointment booking end-to-end
- [ ] Verify Stripe Connect onboarding works
- [ ] Check Stripe webhook receives events
- [ ] Verify blockchain records on Sui Explorer
- [ ] Test video call functionality
- [ ] Set up monitoring (Vercel Analytics, Sentry)
- [ ] Configure custom domain
- [ ] Add SSL certificate (automatic with Vercel)
- [ ] Set up backup strategy for Supabase
- [ ] Review Stripe Connect payout schedule
- [ ] Test cancellation and refund flow
- [ ] Verify email notifications work
- [ ] Check mobile responsiveness
- [ ] Test with real doctor and patient

## 9. Monitoring & Maintenance

### Logs

- **Vercel**: Dashboard → your-project → Logs
- **Supabase**: Dashboard → Logs
- **Stripe**: Dashboard → Developers → Logs
- **Sui**: Check transaction digests on Sui Explorer

### Errors

- Set up error tracking with Sentry or similar
- Monitor Stripe webhook failures
- Check Supabase error logs daily

### Backups

- Supabase auto-backs up database
- Download backups weekly from Dashboard → Database → Backups

## 10. Scaling Considerations

### When you hit 100+ appointments/day:

1. **Database**: Upgrade Supabase plan for more connections
2. **Stripe**: Contact for volume pricing
3. **Sui**: Implement transaction batching
4. **Video**: Consider dedicated Twilio plan
5. **CDN**: Use Cloudflare or Vercel Edge for static assets

### When you hit 1000+ doctors:

1. **Search**: Add Algolia or Elasticsearch
2. **Caching**: Implement Redis for frequently accessed data
3. **Queue**: Add background job processing (BullMQ)
4. **Monitoring**: Upgrade to DataDog or New Relic

## Troubleshooting

### Sui deployment fails
- Check gas budget is sufficient
- Verify you have devnet tokens (`sui client gas`)
- Check for syntax errors in Move code

### Stripe webhook not receiving events
- Verify webhook URL is correct
- Check SSL certificate is valid
- Test webhook in Stripe Dashboard

### Video calls not working
- Verify Twilio credentials are correct
- Check browser permissions for camera/mic
- Ensure appointment is within 15min window

### NPPES verification fails
- Check NPI number is correct (10 digits)
- Verify name matches exactly
- Try manual review for edge cases

## Support

For issues:
1. Check GitHub Issues
2. Review Stripe/Supabase/Sui documentation
3. Open new issue with error logs

## Security Notes

- Never commit `.env.local` to git
- Rotate API keys quarterly
- Use Stripe test mode until thoroughly tested
- Enable Supabase RLS policies (already in migration)
- Keep Sui private key in secure vault for production
- Set up 2FA on all service accounts
- Monitor for suspicious activity

## Next Steps After MVP

1. Add email notifications (Resend, SendGrid)
2. Implement SMS reminders (Twilio)
3. Add doctor availability calendar
4. Build mobile app (React Native)
5. Integrate prescription service (DrFirst)
6. Add patient medical history forms
7. Implement reviews and ratings
8. Add referral program
9. Build admin dashboard
10. Add analytics (Mixpanel, Amplitude)
