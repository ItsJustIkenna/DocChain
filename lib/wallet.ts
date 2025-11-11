import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64, toB64 } from '@mysten/sui.js/utils';

// Only import crypto on server-side
let crypto: typeof import('crypto');
if (typeof window === 'undefined') {
  crypto = require('crypto');
}

// Fail-fast in production if WALLET_ENCRYPTION_KEY is not set
if (typeof window === 'undefined') {
  if (!process.env.WALLET_ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('WALLET_ENCRYPTION_KEY environment variable is required in production');
    }
    console.warn('⚠️ WARNING: Using default WALLET_ENCRYPTION_KEY. Set WALLET_ENCRYPTION_KEY env var for security.');
  }
}

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || 'dev-only-insecure-wallet-encryption-key-32-chars';

/**
 * Generate a new Sui custodial wallet for a patient
 * SERVER-SIDE ONLY
 */
export function generateCustodialWallet() {
  if (typeof window !== 'undefined') {
    throw new Error('Wallet generation is only available on server-side');
  }
  
  const keypair = new Ed25519Keypair();
  const address = keypair.getPublicKey().toSuiAddress();
  
  // Export keypair - this gives us the private key in the correct format
  const { privateKey } = keypair.export();
  
  return {
    address,
    privateKey, // Already in base64 string format
  };
}

/**
 * Encrypt a private key for storage
 */
export function encryptPrivateKey(privateKey: string): string {
  if (!crypto) {
    throw new Error('Encryption is only available on server-side');
  }
  
  const algorithm = 'aes-256-gcm';
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a private key from storage
 */
export function decryptPrivateKey(encryptedData: string): string {
  if (!crypto) {
    throw new Error('Decryption is only available on server-side');
  }
  
  const algorithm = 'aes-256-gcm';
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Get keypair from encrypted private key
 */
export function getKeypairFromEncrypted(encryptedPrivateKey: string): Ed25519Keypair {
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  const privateKeyBytes = fromB64(privateKey);
  
  return Ed25519Keypair.fromSecretKey(privateKeyBytes);
}

/**
 * Export private key in Sui wallet format (for patient to import to external wallet)
 */
export function exportToSuiWalletFormat(encryptedPrivateKey: string): string {
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  // Return in base64 format that Sui wallets can import
  return privateKey;
}
