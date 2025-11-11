import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Derives a key from a password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts data using AES-256-GCM
 * @param text - Plain text to encrypt
 * @param password - Encryption password (typically patient-specific key)
 * @returns Encrypted data as base64 string (format: salt:iv:authTag:encrypted)
 */
export function encrypt(text: string, password: string): string {
  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key from password
    const key = deriveKey(password, salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the data
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine salt, iv, authTag, and encrypted data
    // Format: salt:iv:authTag:encrypted
    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data encrypted with AES-256-GCM
 * @param encryptedData - Encrypted data as base64 string
 * @param password - Decryption password
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string, password: string): string {
  try {
    // Split the encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }
    
    const salt = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];
    
    // Derive the same key
    const key = deriveKey(password, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generates a SHA-256 hash of the data (for blockchain storage)
 * @param data - Data to hash
 * @returns Hex string of the hash
 */
export function generateHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generates a secure random encryption key
 * @returns Base64 encoded random key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Verifies if encrypted data matches the expected hash
 * @param encryptedData - Encrypted data
 * @param expectedHash - Expected SHA-256 hash
 * @returns True if hash matches
 */
export function verifyDataIntegrity(encryptedData: string, expectedHash: string): boolean {
  const actualHash = generateHash(encryptedData);
  return actualHash === expectedHash;
}

/**
 * Gets the master encryption key from environment
 * In production, this should come from a secure key management system (AWS KMS, HashiCorp Vault, etc.)
 */
export function getMasterKey(): string {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable is required in production');
    }
    console.warn('⚠️ WARNING: ENCRYPTION_MASTER_KEY not set. Using insecure fallback for development only.');
    return 'dev-only-insecure-master-encryption-key-min-32-chars';
  }
  return key;
}

/**
 * Gets patient-specific encryption key
 * In production, each patient would have their own key stored securely
 */
export function getPatientEncryptionKey(patientId: string): string {
  // In production, retrieve from secure key store
  // For now, derive from master key + patient ID
  const masterKey = getMasterKey();
  return crypto
    .createHash('sha256')
    .update(`${masterKey}:${patientId}`)
    .digest('base64');
}
