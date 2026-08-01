import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export const KEY_LENGTH_BITS = 256;
const KEY_LENGTH_BYTES = KEY_LENGTH_BITS / 8; // 32
const IV_LENGTH_BYTES = 16;
const AUTH_TAG_LENGTH_BYTES = 16;
const ALGORITHM = 'aes-256-gcm';

// Loaded exclusively from the environment — no fallback literal key.
function getKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY environment variable is not set. ' +
      'Provide a 32-byte (64 hex character) key.',
    );
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY must decode to exactly ${KEY_LENGTH_BYTES} bytes ` +
      `(${KEY_LENGTH_BITS} bits). Got ${key.length} bytes.`,
    );
  }
  return key;
}

// Encrypted format: base64( IV[16 bytes] || ciphertext || authTag[16 bytes] )
export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, authTag]).toString('base64');
}

export function decryptField(ciphertext: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, IV_LENGTH_BYTES);
  const authTag = buf.subarray(buf.length - AUTH_TAG_LENGTH_BYTES);
  const encrypted = buf.subarray(IV_LENGTH_BYTES, buf.length - AUTH_TAG_LENGTH_BYTES);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function encryptPiiObject<T extends Record<string, unknown>>(obj: T, fields: string[]): T {
  const result = { ...obj } as Record<string, unknown>;
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string') {
      result[field] = encryptField(value);
    }
  }
  return result as T;
}

export function decryptPiiObject<T extends Record<string, unknown>>(obj: T, fields: string[]): T {
  const result = { ...obj } as Record<string, unknown>;
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string') {
      result[field] = decryptField(value);
    }
  }
  return result as T;
}

// PII fields encrypted in customer-profile and onboarding (VerificationCase) tables.
export const SENSITIVE_PII_FIELDS: readonly string[] = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'addressLine1',
  'city',
  'postalCode',
  'deliveryAddress',
  'idNumber',
] as const;

// Payment-attempt sensitive references — separate from PII concerns.
export const PAYMENT_SENSITIVE_FIELDS: readonly string[] = [
  'maskedCardReference',
  'walletReference',
  'mobileMoneyReference',
] as const;
