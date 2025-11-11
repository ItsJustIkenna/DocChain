# 🏥 DocChain

> Decentralized Healthcare Platform with Blockchain-Verified Appointments & Secure Medical Records

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Sui Blockchain](https://img.shields.io/badge/Sui-Blockchain-6fbcf0)](https://sui.io/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

DocChain is a full-stack healthcare booking and management platform that combines traditional payment systems with blockchain technology for transparency, security, and patient-owned medical records. Built with Next.js 14, Supabase, Stripe, and Sui blockchain.

## ✨ Key Features

### For Patients
- 🔍 **Browse & Book Doctors** - Search by specialty, view profiles, and book appointments
- 💳 **Fiat Payments** - Pay with credit/debit cards via Stripe (no crypto required)
- 🎥 **HIPAA-Compliant Video Calls** - Secure telemedicine via Twilio Video
- 📱 **Appointment Reminders** - Email notifications 24h and 1h before appointments
- 🔐 **Own Your Medical Records** - Patient-controlled access via blockchain NFTs
- 💰 **Smart Refunds** - Automated refund policy (100% if cancelled 24h+ in advance)
- 🔗 **Blockchain Transparency** - All appointments recorded on Sui blockchain

### For Doctors
- 📋 **NPI Verification** - Automatic credential verification via NPPES API
- 💼 **Stripe Connect** - Direct payouts, keep 88-92% of consultation fees
- 📅 **Availability Management** - Set your own schedule and pricing ($30-$150)
- 📝 **Encrypted Medical Notes** - HIPAA-compliant AES-256-GCM encryption
- 📊 **Dashboard** - View appointments, earnings, and patient records
- ⛓️ **Blockchain Registry** - Immutable proof of consultations

### For Admins
- 🛡️ **Admin Portal** - Verify doctors and manage platform
- 📈 **Audit Logs** - Complete activity tracking for compliance
- 🔒 **Role-Based Access Control** - Secure admin authentication

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 14)                    │
│  React, TypeScript, Tailwind CSS, Server Components          │
└────────────────────┬─────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────┐
│                    Backend (API Routes)                      │
│  /api/appointments  /api/doctors  /api/video  /api/webhooks │
└──┬─────────┬─────────┬──────────┬──────────┬────────────────┘
   │         │         │          │          │
   ▼         ▼         ▼          ▼          ▼
┌─────┐  ┌──────┐  ┌─────┐  ┌────────┐  ┌──────────┐
│Supa │  │Stripe│  │Twilio│ │ NPPES  │  │   Sui    │
│base │  │      │  │Video │ │  API   │  │Blockchain│
└─────┘  └──────┘  └─────┘  └────────┘  └──────────┘
  │                                           │
  ▼                                           ▼
PostgreSQL                            Smart Contracts
(Encrypted                           (Appointment NFTs
Medical Records)                      & Medical Records)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Supabase account (free tier works)
- Stripe account (for payments)
- Twilio account (for video calls)
- Sui CLI (optional, for blockchain deployment)

### Installation

```powershell
# Clone the repository
git clone https://github.com/ItsJustIkenna/DocChain.git
cd DocChain

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your API keys (see Configuration section)

# Run database migrations
# Go to Supabase Dashboard > SQL Editor
# Run files in supabase/migrations/ in order (000-011)

# Start development server
npm run dev
```

Visit `http://localhost:3001`

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file with the following:

```bash
# Supabase (Database & Auth)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe (Payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Twilio (Video Calls)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_API_KEY_SID=your_twilio_api_key_sid
TWILIO_API_KEY_SECRET=your_twilio_api_key_secret

# Sui Blockchain (Optional for local dev)
SUI_PACKAGE_ID=0x_your_deployed_package_id
NEXT_PUBLIC_SUI_NETWORK=devnet
SUI_ADMIN_PRIVATE_KEY=your_sui_admin_private_key

# Security Keys (Generate with: openssl rand -hex 32)
JWT_SECRET=your_64_char_hex_string
WALLET_ENCRYPTION_KEY=your_64_char_hex_string

# Rate Limiting (Optional - Upstash Redis)
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Cron Job Protection
CRON_SECRET=your_random_secret_for_cron_jobs

# Email (Optional - for production)
# SendGrid
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Or Mailgun
MAILGUN_API_KEY=your_mailgun_key
MAILGUN_DOMAIN=your_mailgun_domain
MAILGUN_FROM_EMAIL=noreply@yourdomain.com
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed setup instructions.

## 📁 Project Structure

```
DocChain/
├── app/                        # Next.js 14 App Router
│   ├── api/                   # Backend API routes
│   │   ├── appointments/      # Booking, cancellation, medical notes
│   │   ├── auth/              # Signup, login, email verification
│   │   ├── doctors/           # Registration, availability, profile
│   │   ├── medical-records/   # Encrypted medical record storage
│   │   ├── video/             # Twilio video token generation
│   │   └── webhooks/          # Stripe payment events
│   ├── appointments/          # Patient appointment views
│   ├── doctors/               # Doctor dashboard & management
│   ├── medical-records/       # Patient record viewer
│   └── page.tsx               # Landing page
├── components/                 # Reusable React components
│   ├── WalletConnect.tsx      # Sui wallet integration
│   └── AccountDropdown.tsx    # User menu
├── contexts/                   # React Context providers
│   └── AuthContext.tsx        # Authentication state
├── lib/                        # Core utilities & integrations
│   ├── supabase.ts            # Database client
│   ├── stripe.ts              # Payment processing
│   ├── sui.ts                 # Blockchain integration
│   ├── twilio.ts              # Video call tokens
│   ├── encryption.ts          # AES-256-GCM medical data encryption
│   ├── nppes.ts               # Doctor NPI verification
│   ├── rate-limit.ts          # DDoS protection
│   └── audit.ts               # Compliance logging
├── sui/                        # Sui Move smart contracts
│   └── sources/
│       └── appointment_registry.move
├── sui_contracts/
│   └── sources/
│       └── medical_records.move
├── supabase/migrations/       # Database schema (PostgreSQL)
│   ├── 001_initial_schema.sql
│   ├── 007_add_email_verification.sql
│   ├── 010_create_audit_logs.sql
│   └── 011_create_medical_records.sql
└── docs/                       # Documentation
    ├── QUICKSTART.md
    ├── BLOCKCHAIN.md
    ├── DEPLOYMENT.md
    ├── SECURITY_IMPLEMENTATION.md
    └── MEDICAL_RECORDS_ARCHITECTURE.md
```

## 🛡️ Security Features

DocChain implements enterprise-grade security:

- ✅ **AES-256-GCM Encryption** - Medical notes encrypted at rest (HIPAA-compliant)
- ✅ **Rate Limiting** - DDoS protection on auth and booking endpoints
- ✅ **Email Verification** - Token-based signup verification
- ✅ **JWT Authentication** - Secure session management
- ✅ **Admin RBAC** - Role-based access control for admin functions
- ✅ **Audit Logging** - Complete activity trail for compliance
- ✅ **Stripe Webhooks** - Secure payment verification
- ✅ **Video Token Expiration** - 4-hour TTL on Twilio tokens
- ✅ **SQL Injection Prevention** - Parameterized queries
- ✅ **XSS Protection** - Input sanitization

See [docs/SECURITY_IMPLEMENTATION.md](docs/SECURITY_IMPLEMENTATION.md) for complete security audit.

## ⛓️ Blockchain Integration

### Sui Smart Contracts

DocChain uses Sui blockchain for:

1. **Appointment Registry** (`appointment_registry.move`)
   - Immutable appointment records
   - Doctor verification on-chain
   - Patient-owned appointment NFTs
   - Transparent audit trail

2. **Medical Records** (`medical_records.move`)
   - SHA-256 hashes of encrypted records
   - Patient-controlled access grants
   - Time-limited permissions
   - Tamper detection

### Key Benefits
- 🔒 **Immutability** - Records cannot be altered or deleted
- 👤 **Patient Ownership** - You own your medical data as NFTs
- 🔍 **Transparency** - All appointments publicly verifiable
- 🚫 **No PHI on Chain** - Only metadata, not sensitive health info

View any appointment on [Sui Explorer](https://suiscan.xyz/devnet).

See [docs/BLOCKCHAIN.md](docs/BLOCKCHAIN.md) for details.

## 💳 Payment Flow

1. **Patient books appointment** - Selects doctor, date, time
2. **Stripe checkout** - Secure payment processing
3. **Webhook verification** - Confirms payment success
4. **Database update** - Marks appointment as confirmed
5. **Blockchain record** - Creates immutable on-chain record
6. **Email notification** - Sends confirmation to both parties
7. **Stripe Connect payout** - Doctor receives 88-92% of fee

### Cancellation Policy
- **24+ hours notice**: 100% refund
- **<24 hours notice**: No refund
- Automated via Stripe Refunds API

## 🎥 Video Consultations

Built on Twilio Programmable Video:
- HIPAA-compliant infrastructure
- HD video quality
- Screen sharing support
- 4-hour token expiration
- Automatic room cleanup

## 📊 Database Schema

### Key Tables
- `profiles` - User accounts (patients & doctors)
- `doctors` - Doctor credentials, pricing, availability
- `appointments` - Booking records with blockchain references
- `medical_records` - Encrypted patient data
- `access_grants` - Permission management
- `audit_logs` - Compliance tracking

All medical data encrypted with AES-256-GCM.

See migrations in `supabase/migrations/` for complete schema.

## 🧪 Development

### Running Locally

```powershell
npm run dev              # Start dev server (localhost:3001)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint
```

### Deploy Sui Contracts

```powershell
cd sui
sui move build                                    # Compile contracts
sui client publish --gas-budget 100000000        # Deploy to Sui
# Copy package ID to .env.local SUI_PACKAGE_ID
```

### Database Seeding

```powershell
# Run in Supabase SQL Editor
psql -f supabase/migrations/002_seed_data.sql

# Or use PowerShell script
.\scripts\seed-database.ps1
```

## 📖 Documentation

- [Quick Start Guide](docs/QUICKSTART.md) - Get up and running in 5 minutes
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment to Vercel
- [Blockchain Architecture](docs/BLOCKCHAIN.md) - How appointments are recorded
- [Medical Records](docs/MEDICAL_RECORDS_ARCHITECTURE.md) - Patient data management
- [Security Audit](docs/SECURITY_IMPLEMENTATION.md) - 15 critical issues resolved
- [Testing Guide](docs/TESTING.md) - End-to-end testing instructions

## 🚢 Deployment

### Vercel (Recommended)

```powershell
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Add environment variables in Vercel dashboard
```

### Environment Setup
1. Add all `.env.local` variables to Vercel
2. Configure Stripe webhooks to point to your domain
3. Set up Vercel Cron Jobs for appointment reminders
4. Enable Vercel Analytics (optional)

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete guide.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@docchain.health
- 📚 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/ItsJustIkenna/DocChain/issues)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a service
- [Stripe](https://stripe.com/) - Payment processing
- [Sui](https://sui.io/) - Blockchain platform
- [Twilio](https://www.twilio.com/) - Video infrastructure
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## 📊 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes, Node.js |
| **Database** | PostgreSQL (Supabase) |
| **Authentication** | Supabase Auth, JWT |
| **Payments** | Stripe, Stripe Connect |
| **Video** | Twilio Programmable Video |
| **Blockchain** | Sui, Move Language |
| **Encryption** | AES-256-GCM, PBKDF2 |
| **Rate Limiting** | Upstash Redis |
| **Email** | SendGrid / Mailgun |
| **Hosting** | Vercel |

---

**Built with ❤️ for better healthcare**

[Live Demo](https://docchain.vercel.app) • [Documentation](docs/) • [Report Bug](https://github.com/ItsJustIkenna/DocChain/issues)