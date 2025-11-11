import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';
import { bech32 } from '@scure/base';

const network = (process.env.NEXT_PUBLIC_SUI_NETWORK as 'devnet' | 'testnet' | 'mainnet') || 'devnet';
const packageId = process.env.SUI_PACKAGE_ID!;
const adminCapId = process.env.SUI_ADMIN_CAP_ID!;

// Initialize Sui client
export const suiClient = new SuiClient({ url: getFullnodeUrl(network) });

// Admin keypair (server-side only)
let adminKeypair: Ed25519Keypair | null = null;

function getAdminKeypair() {
  if (!adminKeypair) {
    if (process.env.SUI_PRIVATE_KEY) {
      try {
        console.log('[Sui] Decoding private key...');
        const keyStr = process.env.SUI_PRIVATE_KEY;
        
        // Try using bech32 decode with skipValidation
        let decoded;
        try {
          decoded = bech32.decodeToBytes(keyStr);
        } catch (checksumError) {
          console.log('[Sui] Checksum validation failed, trying without validation...');
          // If checksum fails, try decoding manually
          // Extract the data part after 'suiprivkey1'
          const dataStr = keyStr.replace('suiprivkey1', '');
          // Use bech32.decode which returns words
          const { prefix, words } = bech32.decode(keyStr as any, 100);
          console.log('[Sui] Prefix:', prefix);
          // Convert 5-bit words to 8-bit bytes
          decoded = { prefix, bytes: new Uint8Array(bech32.fromWords(words)) };
        }
        
        console.log('[Sui] Decoded prefix:', decoded.prefix);
        console.log('[Sui] Decoded bytes length:', decoded.bytes.length);
        
        // First byte is the key scheme flag (0x00 for ED25519)
        const scheme = decoded.bytes[0];
        console.log('[Sui] Key scheme:', scheme);
        
        if (scheme !== 0x00) {
          throw new Error(`Expected ED25519 scheme (0x00), got: ${scheme}`);
        }
        
        // Rest is the 32-byte private key
        const secretKey = new Uint8Array(decoded.bytes.slice(1));
        console.log('[Sui] Secret key length:', secretKey.length);
        
        if (secretKey.length !== 32) {
          throw new Error(`Expected 32-byte private key, got: ${secretKey.length}`);
        }
        
        adminKeypair = Ed25519Keypair.fromSecretKey(secretKey);
        const address = adminKeypair.getPublicKey().toSuiAddress();
        console.log('[Sui] ✓ Admin address:', address);
        console.log('[Sui] Expected:        0xb6b784d8ca0b2e77033e31dcb8f661d7a7165146a24ba770e1760e75c8caddf4');
        
      } catch (error) {
        console.error('[Sui] Failed to load admin keypair:', error);
        throw error;
      }
    } else {
      throw new Error('SUI_PRIVATE_KEY not configured');
    }
  }
  return adminKeypair;
}

/**
 * Register doctor on Sui blockchain
 */
export async function registerDoctorOnSui(
  doctorAddress: string,
  doctorId: string,
  npiNumber: string,
  licenseHash: string,
  specialty: string
) {
  const keypair = getAdminKeypair();
  if (!keypair) throw new Error('Admin keypair not configured');

  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${packageId}::appointment_registry::register_doctor`,
    arguments: [
      tx.object(adminCapId),
      tx.pure(doctorAddress),
      tx.pure(Array.from(new TextEncoder().encode(doctorId))),
      tx.pure(Array.from(new TextEncoder().encode(npiNumber))),
      tx.pure(Array.from(new TextEncoder().encode(licenseHash))),
      tx.pure(Array.from(new TextEncoder().encode(specialty))),
    ],
  });

  const result = await suiClient.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  return result;
}

/**
 * Record appointment on Sui blockchain
 */
export async function recordAppointmentOnSui(
  doctorAddress: string,
  appointmentId: string,
  patientAddress: string,
  appointmentTimestamp: number,
  priceUsdCents: number
) {
  const keypair = getAdminKeypair();
  if (!keypair) throw new Error('Admin keypair not configured');

  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${packageId}::appointment_registry::record_appointment_by_admin`,
    arguments: [
      tx.object(adminCapId),
      tx.pure(doctorAddress),
      tx.pure(Array.from(new TextEncoder().encode(appointmentId))),
      tx.pure(patientAddress),
      tx.pure(appointmentTimestamp),
      tx.pure(priceUsdCents),
    ],
  });

  const result = await suiClient.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
      showEvents: true,
    },
  });

  return result;
}

/**
 * Record cancellation on Sui blockchain
 */
export async function recordCancellationOnSui(
  appointmentId: string,
  refundAmountCents: number
) {
  const keypair = getAdminKeypair();
  if (!keypair) throw new Error('Admin keypair not configured');

  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${packageId}::appointment_registry::record_cancellation`,
    arguments: [
      tx.pure(Array.from(new TextEncoder().encode(appointmentId))),
      tx.pure(refundAmountCents),
    ],
  });

  const result = await suiClient.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  return result;
}

/**
 * Get appointment record from Sui
 */
export async function getAppointmentRecord(objectId: string) {
  const object = await suiClient.getObject({
    id: objectId,
    options: {
      showContent: true,
      showType: true,
    },
  });

  return object;
}

/**
 * Get doctor profile from Sui
 */
export async function getDoctorProfile(objectId: string) {
  const object = await suiClient.getObject({
    id: objectId,
    options: {
      showContent: true,
      showType: true,
    },
  });

  return object;
}

/**
 * Get Sui explorer URL for transaction
 */
export function getExplorerUrl(digest: string) {
  const baseUrl = network === 'mainnet' 
    ? 'https://suiscan.xyz/mainnet/tx'
    : `https://suiscan.xyz/${network}/tx`;
  return `${baseUrl}/${digest}`;
}

/**
 * Get Sui explorer URL for object
 */
export function getObjectExplorerUrl(objectId: string) {
  const baseUrl = network === 'mainnet' 
    ? 'https://suiscan.xyz/mainnet/object'
    : `https://suiscan.xyz/${network}/object`;
  return `${baseUrl}/${objectId}`;
}

/**
 * Get transaction details from blockchain
 */
export async function getTransactionDetails(digest: string) {
  const tx = await suiClient.getTransactionBlock({
    digest,
    options: {
      showEffects: true,
      showEvents: true,
      showInput: true,
      showObjectChanges: true,
    },
  });

  return tx;
}

/**
 * Get appointments by patient address
 */
export async function getPatientAppointments(patientAddress: string) {
  const objects = await suiClient.getOwnedObjects({
    owner: patientAddress,
    filter: {
      StructType: `${packageId}::appointment_registry::AppointmentRecord`,
    },
    options: {
      showContent: true,
      showType: true,
    },
  });

  return objects.data;
}

/**
 * Get doctor profiles by address
 */
export async function getDoctorProfiles(doctorAddress: string) {
  const objects = await suiClient.getOwnedObjects({
    owner: doctorAddress,
    filter: {
      StructType: `${packageId}::appointment_registry::DoctorProfile`,
    },
    options: {
      showContent: true,
      showType: true,
    },
  });

  return objects.data;
}

/**
 * Claim appointment - transfer appointment from placeholder address (0x0) to real patient wallet
 */
export async function claimAppointmentOnSui(
  appointmentId: string,
  patientAddress: string,
  doctorAddress: string,
  appointmentTimestamp: number,
  priceUsdCents: number
) {
  const keypair = getAdminKeypair();
  if (!keypair) throw new Error('Admin keypair not configured');

  const placeholderAddress = '0x0000000000000000000000000000000000000000000000000000000000000000';

  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${packageId}::appointment_registry::claim_appointment`,
    arguments: [
      tx.object(adminCapId),
      tx.pure(Array.from(new TextEncoder().encode(appointmentId))),
      tx.pure(placeholderAddress), // Old patient address (0x0)
      tx.pure(patientAddress), // New patient address (their wallet)
      tx.pure(doctorAddress),
      tx.pure(appointmentTimestamp),
      tx.pure(priceUsdCents),
    ],
  });

  const result = await suiClient.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
      showEvents: true,
    },
  });

  return result;
}
