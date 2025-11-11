# Viewing Blockchain Transactions

DocChain records all confirmed appointments on the Sui blockchain for transparency and immutability.

## How to View Your Appointment on the Blockchain

### 1. From the Success Page
After payment confirmation, your success page will display:
- **Payment ID**: The Stripe payment intent ID
- **Blockchain Transaction**: A clickable link to view the transaction on Sui Explorer

### 2. Sui Explorer
Click the blockchain transaction link to view:
- **Transaction Details**: Block height, timestamp, gas fees
- **Events Emitted**: `AppointmentRecorded` event with:
  - Appointment ID
  - Doctor's blockchain address
  - Patient's blockchain address
  - Appointment timestamp
  - Price paid
- **Object Changes**: The `AppointmentRecord` NFT created and transferred to the patient

### 3. Your Appointment NFT
As a patient, you receive an `AppointmentRecord` NFT that proves:
- You have a confirmed appointment
- The doctor, date, and price are immutable
- Payment was verified on-chain

This NFT is stored in your Sui wallet and can be:
- Viewed in any Sui wallet
- Transferred (if needed for medical records portability)
- Used as proof of medical consultation

## Benefits of Blockchain Recording

✅ **Transparency**: All appointment details are publicly verifiable
✅ **Immutability**: Records cannot be altered or deleted
✅ **Patient Ownership**: You own your medical appointment records as NFTs
✅ **No Intermediaries**: Direct doctor-patient relationship verified on-chain
✅ **Audit Trail**: Complete history of appointments for compliance

## Network Information

- **Network**: ${process.env.NEXT_PUBLIC_SUI_NETWORK || 'devnet'}
- **Package ID**: ${process.env.SUI_PACKAGE_ID}
- **Explorer**: https://suiscan.xyz/${process.env.NEXT_PUBLIC_SUI_NETWORK || 'devnet'}

## Viewing Your Records

### Via Dashboard
Go to your dashboard and click on any confirmed appointment to see:
- Appointment details
- Payment information
- Blockchain transaction link

### Via Sui Wallet
If you have a Sui wallet:
1. Connect your wallet address during registration
2. View all your `AppointmentRecord` NFTs in your wallet
3. Each NFT contains full appointment details

## API Access

Developers can query blockchain data via our API:

\`\`\`bash
# Get transaction details
GET /api/blockchain/tx/[digest]

# Response includes:
{
  "transaction": { /* Full transaction data */ },
  "explorerUrl": "https://suiscan.xyz/...",
  "network": "devnet"
}
\`\`\`

## Privacy Note

While appointment records are on-chain, they only contain:
- Appointment ID (UUID)
- Doctor/patient addresses (pseudonymous)
- Timestamp and price

**NO personal health information** is stored on the blockchain - only appointment metadata for transparency and verification.
