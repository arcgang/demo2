// Inject a deterministic 32-byte (256-bit) AES test key so the encryption
// module can load in the Jest environment without a real secret store.
// This key is only used in tests — never shipped or committed as production key material.
if (!process.env.FIELD_ENCRYPTION_KEY) {
  // 64 hex chars = 32 bytes = 256 bits
  process.env.FIELD_ENCRYPTION_KEY = 'a'.repeat(64);
}
