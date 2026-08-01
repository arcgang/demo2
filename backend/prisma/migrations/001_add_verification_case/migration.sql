-- Migration: 001_add_verification_case
-- Adds the verification_case table for KYC/RICA onboarding cases.

CREATE TYPE "VerificationCaseType" AS ENUM ('KYC', 'RICA');
CREATE TYPE "VerificationCaseStatus" AS ENUM ('pending', 'verified', 'failed');

CREATE TABLE "verification_case" (
    "id"              UUID                    NOT NULL DEFAULT gen_random_uuid(),
    "orderId"         VARCHAR(128)            NOT NULL,
    "customerId"      VARCHAR(128)            NOT NULL,
    "type"            "VerificationCaseType"  NOT NULL,
    "status"          "VerificationCaseStatus" NOT NULL DEFAULT 'pending',
    "submittedAt"     TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    "resolvedAt"      TIMESTAMPTZ,
    "identityFields"  JSONB                   NOT NULL,
    "auditRef"        VARCHAR(256)            NOT NULL,

    CONSTRAINT "verification_case_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "verification_case_orderId_idx" ON "verification_case" ("orderId");
