-- Migration: 002_enable_pgcrypto
-- Enables the pgcrypto extension for PostgreSQL cryptographic support.
-- pgcrypto provides cryptographically secure random generation (gen_random_bytes,
-- gen_random_uuid) and hash/HMAC functions. Note: PII column encryption is
-- performed at the application layer (AES-256-GCM via Node.js crypto in
-- fieldEncryption.ts); pgcrypto is not used for column-level encryption here.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
