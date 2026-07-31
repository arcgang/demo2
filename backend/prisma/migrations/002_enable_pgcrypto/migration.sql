-- Migration: 002_enable_pgcrypto
-- Enables the pgcrypto extension for PostgreSQL transparent encryption support.
-- pgcrypto provides AES-based column encryption functions (pgp_sym_encrypt /
-- pgp_sym_decrypt) and cryptographically secure random generation used by
-- gen_random_uuid() already in use in migration 001.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
