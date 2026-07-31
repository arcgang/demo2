-- Migration: 002_add_consent_and_audit
-- Adds consent_records and audit_events tables for POPIA consent capture and business event logging.

CREATE TYPE "ConsentPurpose" AS ENUM ('terms', 'marketing');

CREATE TYPE "AuditEventType" AS ENUM (
  'consent_capture',
  'payment_outcome',
  'verification_outcome',
  'order_created',
  'activation_status_change'
);

CREATE TABLE "consent_records" (
    "id"          UUID             NOT NULL DEFAULT gen_random_uuid(),
    "orderId"     VARCHAR(128)     NOT NULL,
    "sessionId"   VARCHAR(128)     NOT NULL,
    "purpose"     "ConsentPurpose" NOT NULL,
    "accepted"    BOOLEAN          NOT NULL,
    "capturedAt"  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    "ipAddress"   VARCHAR(64),

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consent_records_orderId_idx" ON "consent_records" ("orderId");

CREATE TABLE "audit_events" (
    "id"          UUID              NOT NULL DEFAULT gen_random_uuid(),
    "eventType"   "AuditEventType"  NOT NULL,
    "orderId"     VARCHAR(128)      NOT NULL,
    "journeyRef"  VARCHAR(128),
    "actorRef"    VARCHAR(128),
    "payload"     JSONB             NOT NULL DEFAULT '{}'::jsonb,
    "occurredAt"  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_events_orderId_idx" ON "audit_events" ("orderId");
CREATE INDEX "audit_events_occurredAt_idx" ON "audit_events" ("occurredAt");
