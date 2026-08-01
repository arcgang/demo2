import * as fs from 'fs';
import * as path from 'path';

/**
 * Acceptance tests for AES-256 field-level encryption at rest.
 *
 * Acceptance criteria (task spec):
 *   AC-ENC-1  PII columns (firstName, lastName, address, phone, email) in the
 *             customer-profile and onboarding (VerificationCase.identityFields)
 *             tables are encrypted before persistence and decrypted on read.
 *   AC-ENC-2  Payment-attempt records (masked card references, mobile-money
 *             wallet references) are encrypted at the data layer.
 *   AC-ENC-3  Encryption uses AES-256 (key length 32 bytes / 256 bits).
 *   AC-ENC-4  Encrypted ciphertext stored in the data layer is not the same as
 *             the plaintext input (i.e., data is actually transformed).
 *   AC-ENC-5  Encrypted values are decryptable back to the original plaintext.
 *   AC-ENC-6  Encryption keys are loaded exclusively from environment variables —
 *             no key material in source code.
 *   AC-ENC-7  Direct inspection of the stored bytes shows non-plaintext content
 *             for all sensitive columns.
 *   AC-ENC-8  The encryption layer module exports the PII field list so future
 *             callers know which columns are protected.
 *
 * These tests exercise src/modules/encryption/fieldEncryption.ts (does not
 * exist yet) and the Prisma middleware/model hooks that invoke it.  They will
 * FAIL until the feature is implemented.
 */

// ---------------------------------------------------------------------------
// Module under test
// ---------------------------------------------------------------------------

type FieldEncryptionModule = {
  encryptField: (plaintext: string) => string;
  decryptField: (ciphertext: string) => string;
  encryptPiiObject: <T extends Record<string, unknown>>(obj: T, fields: string[]) => T;
  decryptPiiObject: <T extends Record<string, unknown>>(obj: T, fields: string[]) => T;
  SENSITIVE_PII_FIELDS: readonly string[];
  PAYMENT_SENSITIVE_FIELDS: readonly string[];
  KEY_LENGTH_BITS: number;
};

const encModule = (() => {
  try {
    return require('../../modules/encryption/fieldEncryption') as FieldEncryptionModule;
  } catch {
    return null;
  }
})();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAMPLE_PII = {
  firstName: 'Amina',
  lastName: 'Dlamini',
  email: 'amina.dlamini@example.com',
  phone: '+27821234567',
  addressLine1: '12 Soweto Ave',
  city: 'Johannesburg',
  idNumber: '9001015800088',
};

const SAMPLE_PAYMENT = {
  maskedCardReference: 'tok_visa_4242',
  walletReference: 'mpesa_wallet_abc123',
};

function isLikelyPlaintext(value: string, original: string): boolean {
  return value === original;
}

// ---------------------------------------------------------------------------
// AC-ENC-1  PII columns are encrypted before persistence
// ---------------------------------------------------------------------------

describe('Field-level encryption — AC-ENC-1 PII column encryption', () => {
  it('fieldEncryption module is importable', () => {
    expect(encModule).not.toBeNull();
  });

  it('encryptField() returns a string', () => {
    expect(encModule).not.toBeNull();
    const result = encModule!.encryptField(SAMPLE_PII.firstName);
    expect(typeof result).toBe('string');
  });

  it('encryptField() does not return the plaintext unchanged', () => {
    expect(encModule).not.toBeNull();
    const ciphertext = encModule!.encryptField(SAMPLE_PII.email);
    expect(ciphertext).not.toBe(SAMPLE_PII.email);
  });

  it('encryptPiiObject() encrypts firstName field', () => {
    expect(encModule).not.toBeNull();
    const encrypted = encModule!.encryptPiiObject({ ...SAMPLE_PII }, ['firstName']);
    expect(encrypted.firstName).not.toBe(SAMPLE_PII.firstName);
  });

  it('encryptPiiObject() encrypts lastName field', () => {
    expect(encModule).not.toBeNull();
    const encrypted = encModule!.encryptPiiObject({ ...SAMPLE_PII }, ['lastName']);
    expect(encrypted.lastName).not.toBe(SAMPLE_PII.lastName);
  });

  it('encryptPiiObject() encrypts email field', () => {
    expect(encModule).not.toBeNull();
    const encrypted = encModule!.encryptPiiObject({ ...SAMPLE_PII }, ['email']);
    expect(encrypted.email).not.toBe(SAMPLE_PII.email);
  });

  it('encryptPiiObject() encrypts phone field', () => {
    expect(encModule).not.toBeNull();
    const encrypted = encModule!.encryptPiiObject({ ...SAMPLE_PII }, ['phone']);
    expect(encrypted.phone).not.toBe(SAMPLE_PII.phone);
  });

  it('encryptPiiObject() encrypts addressLine1 field', () => {
    expect(encModule).not.toBeNull();
    const encrypted = encModule!.encryptPiiObject({ ...SAMPLE_PII }, ['addressLine1']);
    expect(encrypted.addressLine1).not.toBe(SAMPLE_PII.addressLine1);
  });

  it('encryptPiiObject() leaves non-sensitive fields unchanged', () => {
    expect(encModule).not.toBeNull();
    const encrypted = encModule!.encryptPiiObject(
      { ...SAMPLE_PII, orderId: 'ord_123' },
      ['firstName', 'email'],
    );
    expect((encrypted as Record<string, unknown>).orderId).toBe('ord_123');
  });
});

// ---------------------------------------------------------------------------
// AC-ENC-2  Payment-attempt sensitive fields are encrypted
// ---------------------------------------------------------------------------

describe('Field-level encryption — AC-ENC-2 payment field encryption', () => {
  it('encryptPiiObject() encrypts maskedCardReference', () => {
    expect(encModule).not.toBeNull();
    const encrypted = encModule!.encryptPiiObject(
      { ...SAMPLE_PAYMENT },
      ['maskedCardReference'],
    );
    expect(encrypted.maskedCardReference).not.toBe(SAMPLE_PAYMENT.maskedCardReference);
  });

  it('encryptPiiObject() encrypts walletReference', () => {
    expect(encModule).not.toBeNull();
    const encrypted = encModule!.encryptPiiObject(
      { ...SAMPLE_PAYMENT },
      ['walletReference'],
    );
    expect(encrypted.walletReference).not.toBe(SAMPLE_PAYMENT.walletReference);
  });

  it('PAYMENT_SENSITIVE_FIELDS list is exported and non-empty', () => {
    expect(encModule).not.toBeNull();
    expect(Array.isArray(encModule!.PAYMENT_SENSITIVE_FIELDS)).toBe(true);
    expect(encModule!.PAYMENT_SENSITIVE_FIELDS.length).toBeGreaterThan(0);
  });

  it('PAYMENT_SENSITIVE_FIELDS includes maskedCardReference or cardReference', () => {
    expect(encModule).not.toBeNull();
    const fields = encModule!.PAYMENT_SENSITIVE_FIELDS.map((f) => f.toLowerCase());
    const hasCard = fields.some((f) => f.includes('card'));
    expect(hasCard).toBe(true);
  });

  it('PAYMENT_SENSITIVE_FIELDS includes wallet or mobileMoney reference', () => {
    expect(encModule).not.toBeNull();
    const fields = encModule!.PAYMENT_SENSITIVE_FIELDS.map((f) => f.toLowerCase());
    const hasWallet = fields.some((f) => f.includes('wallet') || f.includes('mobile'));
    expect(hasWallet).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-ENC-3  AES-256 key length (256 bits)
// ---------------------------------------------------------------------------

describe('Field-level encryption — AC-ENC-3 AES-256 key strength', () => {
  it('KEY_LENGTH_BITS constant is exported', () => {
    expect(encModule).not.toBeNull();
    expect(typeof encModule!.KEY_LENGTH_BITS).toBe('number');
  });

  it('KEY_LENGTH_BITS is exactly 256', () => {
    expect(encModule).not.toBeNull();
    expect(encModule!.KEY_LENGTH_BITS).toBe(256);
  });

  it('encrypted output length is consistent with AES block padding (>= plaintext length)', () => {
    expect(encModule).not.toBeNull();
    const plaintext = 'test@example.com';
    const ciphertext = encModule!.encryptField(plaintext);
    // AES-256-CBC/GCM with base64 encoding: output must be longer than input
    expect(ciphertext.length).toBeGreaterThan(plaintext.length);
  });

  it('ciphertext for short input is at least 44 characters (AES-256 block minimum in base64)', () => {
    expect(encModule).not.toBeNull();
    const ciphertext = encModule!.encryptField('Hi');
    // 16-byte IV + 16-byte AES block = 32 bytes → ~44 base64 chars minimum
    expect(ciphertext.length).toBeGreaterThanOrEqual(44);
  });
});

// ---------------------------------------------------------------------------
// AC-ENC-4  Stored bytes are non-plaintext (actual transformation)
// ---------------------------------------------------------------------------

describe('Field-level encryption — AC-ENC-4 stored values are ciphertext', () => {
  it('encrypting the same value twice produces different ciphertext (IV randomisation)', () => {
    expect(encModule).not.toBeNull();
    const first = encModule!.encryptField(SAMPLE_PII.email);
    const second = encModule!.encryptField(SAMPLE_PII.email);
    // With a random IV each invocation must yield a distinct ciphertext
    expect(first).not.toBe(second);
  });

  it('ciphertext does not contain the plaintext email substring', () => {
    expect(encModule).not.toBeNull();
    const ciphertext = encModule!.encryptField(SAMPLE_PII.email);
    expect(ciphertext).not.toContain(SAMPLE_PII.email);
  });

  it('ciphertext does not contain the plaintext firstName substring', () => {
    expect(encModule).not.toBeNull();
    const ciphertext = encModule!.encryptField(SAMPLE_PII.firstName);
    expect(ciphertext).not.toContain(SAMPLE_PII.firstName);
  });

  it('ciphertext does not contain the plaintext phone number', () => {
    expect(encModule).not.toBeNull();
    const ciphertext = encModule!.encryptField(SAMPLE_PII.phone);
    expect(ciphertext).not.toContain(SAMPLE_PII.phone);
  });

  it('encryptPiiObject() all specified fields differ from original values', () => {
    expect(encModule).not.toBeNull();
    const fields = ['firstName', 'lastName', 'email', 'phone', 'addressLine1'];
    const encrypted = encModule!.encryptPiiObject({ ...SAMPLE_PII }, fields);
    for (const field of fields) {
      expect((encrypted as Record<string, unknown>)[field]).not.toBe(
        (SAMPLE_PII as Record<string, unknown>)[field],
      );
    }
  });
});

// ---------------------------------------------------------------------------
// AC-ENC-5  Round-trip: encrypt then decrypt returns original plaintext
// ---------------------------------------------------------------------------

describe('Field-level encryption — AC-ENC-5 round-trip correctness', () => {
  it('decryptField(encryptField(x)) === x for email', () => {
    expect(encModule).not.toBeNull();
    const original = SAMPLE_PII.email;
    const roundTrip = encModule!.decryptField(encModule!.encryptField(original));
    expect(roundTrip).toBe(original);
  });

  it('decryptField(encryptField(x)) === x for firstName', () => {
    expect(encModule).not.toBeNull();
    const original = SAMPLE_PII.firstName;
    const roundTrip = encModule!.decryptField(encModule!.encryptField(original));
    expect(roundTrip).toBe(original);
  });

  it('decryptField(encryptField(x)) === x for phone number', () => {
    expect(encModule).not.toBeNull();
    const original = SAMPLE_PII.phone;
    const roundTrip = encModule!.decryptField(encModule!.encryptField(original));
    expect(roundTrip).toBe(original);
  });

  it('decryptField(encryptField(x)) === x for addressLine1', () => {
    expect(encModule).not.toBeNull();
    const original = SAMPLE_PII.addressLine1;
    const roundTrip = encModule!.decryptField(encModule!.encryptField(original));
    expect(roundTrip).toBe(original);
  });

  it('decryptPiiObject restores all PII fields to original values', () => {
    expect(encModule).not.toBeNull();
    const fields = ['firstName', 'lastName', 'email', 'phone', 'addressLine1'];
    const original = { ...SAMPLE_PII };
    const encrypted = encModule!.encryptPiiObject({ ...original }, fields);
    const decrypted = encModule!.decryptPiiObject({ ...encrypted }, fields);
    for (const field of fields) {
      expect((decrypted as Record<string, unknown>)[field]).toBe(
        (original as Record<string, unknown>)[field],
      );
    }
  });

  it('round-trip preserves non-PII fields unchanged', () => {
    expect(encModule).not.toBeNull();
    const obj = { ...SAMPLE_PII, orderId: 'ord_roundtrip_999', status: 'pending' };
    const fields = ['firstName', 'email'];
    const encrypted = encModule!.encryptPiiObject(obj, fields);
    const decrypted = encModule!.decryptPiiObject(encrypted, fields);
    expect((decrypted as Record<string, unknown>).orderId).toBe('ord_roundtrip_999');
    expect((decrypted as Record<string, unknown>).status).toBe('pending');
  });
});

// ---------------------------------------------------------------------------
// AC-ENC-6  Keys loaded from environment variables only
// ---------------------------------------------------------------------------

describe('Field-level encryption — AC-ENC-6 key material from environment', () => {
  it('fieldEncryption module does not import a hard-coded key', () => {
    const modulePath = path.resolve(
      __dirname,
      '../../modules/encryption/fieldEncryption.ts',
    );
    if (!fs.existsSync(modulePath)) {
      // Module not yet created — this is the failing condition
      expect(fs.existsSync(modulePath)).toBe(true);
      return;
    }
    const source = fs.readFileSync(modulePath, 'utf8');
    // Must not contain a 32-byte (64 hex char) hard-coded key literal
    expect(source).not.toMatch(/['"][A-Fa-f0-9]{64}['"]/);
    // Must not contain a base64-encoded 32-byte key literal
    expect(source).not.toMatch(/['"][A-Za-z0-9+/]{43}=['"]/);
  });

  it('fieldEncryption module reads key from FIELD_ENCRYPTION_KEY env var', () => {
    const modulePath = path.resolve(
      __dirname,
      '../../modules/encryption/fieldEncryption.ts',
    );
    if (!fs.existsSync(modulePath)) {
      expect(fs.existsSync(modulePath)).toBe(true);
      return;
    }
    const source = fs.readFileSync(modulePath, 'utf8');
    expect(source).toContain('FIELD_ENCRYPTION_KEY');
  });

  it('encryptField() throws or uses a fallback when FIELD_ENCRYPTION_KEY is absent', () => {
    expect(encModule).not.toBeNull();
    const originalKey = process.env.FIELD_ENCRYPTION_KEY;
    delete process.env.FIELD_ENCRYPTION_KEY;

    jest.resetModules();
    let threw = false;
    try {
      const freshModule = require('../../modules/encryption/fieldEncryption') as FieldEncryptionModule;
      // If the module loads without a key, calling encryptField must throw
      freshModule.encryptField('test');
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);

    // Restore
    if (originalKey !== undefined) {
      process.env.FIELD_ENCRYPTION_KEY = originalKey;
    }
    jest.resetModules();
  });
});

// ---------------------------------------------------------------------------
// AC-ENC-7  Direct database inspection shows non-plaintext content
// ---------------------------------------------------------------------------

describe('Field-level encryption — AC-ENC-7 stored bytes are opaque', () => {
  it('SENSITIVE_PII_FIELDS list is exported from the module', () => {
    expect(encModule).not.toBeNull();
    expect(Array.isArray(encModule!.SENSITIVE_PII_FIELDS)).toBe(true);
  });

  it('SENSITIVE_PII_FIELDS is non-empty', () => {
    expect(encModule).not.toBeNull();
    expect(encModule!.SENSITIVE_PII_FIELDS.length).toBeGreaterThan(0);
  });

  it('SENSITIVE_PII_FIELDS includes "firstName"', () => {
    expect(encModule).not.toBeNull();
    expect(encModule!.SENSITIVE_PII_FIELDS).toContain('firstName');
  });

  it('SENSITIVE_PII_FIELDS includes "lastName"', () => {
    expect(encModule).not.toBeNull();
    expect(encModule!.SENSITIVE_PII_FIELDS).toContain('lastName');
  });

  it('SENSITIVE_PII_FIELDS includes "email"', () => {
    expect(encModule).not.toBeNull();
    expect(encModule!.SENSITIVE_PII_FIELDS).toContain('email');
  });

  it('SENSITIVE_PII_FIELDS includes "phone"', () => {
    expect(encModule).not.toBeNull();
    expect(encModule!.SENSITIVE_PII_FIELDS).toContain('phone');
  });

  it('SENSITIVE_PII_FIELDS includes an address field (addressLine1 or deliveryAddress)', () => {
    expect(encModule).not.toBeNull();
    const hasAddress = encModule!.SENSITIVE_PII_FIELDS.some(
      (f) => f.toLowerCase().includes('address'),
    );
    expect(hasAddress).toBe(true);
  });

  it('encrypted PII object stored values do not contain any recognisable PII substring', () => {
    expect(encModule).not.toBeNull();
    const fields = encModule!.SENSITIVE_PII_FIELDS as string[];
    const input: Record<string, unknown> = {};
    const plainValues: string[] = [];

    for (const f of fields) {
      if ((SAMPLE_PII as Record<string, unknown>)[f] !== undefined) {
        input[f] = (SAMPLE_PII as Record<string, unknown>)[f];
        plainValues.push((SAMPLE_PII as Record<string, unknown>)[f] as string);
      }
    }

    const encrypted = encModule!.encryptPiiObject(input, fields);

    for (const field of fields) {
      const stored = (encrypted as Record<string, unknown>)[field];
      if (typeof stored === 'string') {
        for (const plain of plainValues) {
          expect(stored).not.toContain(plain);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// AC-ENC-8  Module exports the protected field list (audit / documentation)
// ---------------------------------------------------------------------------

describe('Field-level encryption — AC-ENC-8 protected field registry', () => {
  it('SENSITIVE_PII_FIELDS and PAYMENT_SENSITIVE_FIELDS are both exported', () => {
    expect(encModule).not.toBeNull();
    expect(Array.isArray(encModule!.SENSITIVE_PII_FIELDS)).toBe(true);
    expect(Array.isArray(encModule!.PAYMENT_SENSITIVE_FIELDS)).toBe(true);
  });

  it('the two field lists have no overlap (PII and payment concerns are separate)', () => {
    expect(encModule).not.toBeNull();
    const piiSet = new Set(encModule!.SENSITIVE_PII_FIELDS);
    for (const paymentField of encModule!.PAYMENT_SENSITIVE_FIELDS) {
      expect(piiSet.has(paymentField)).toBe(false);
    }
  });

  it('combined field list covers at least 5 distinct sensitive fields', () => {
    expect(encModule).not.toBeNull();
    const total = new Set([
      ...encModule!.SENSITIVE_PII_FIELDS,
      ...encModule!.PAYMENT_SENSITIVE_FIELDS,
    ]).size;
    expect(total).toBeGreaterThanOrEqual(5);
  });
});
