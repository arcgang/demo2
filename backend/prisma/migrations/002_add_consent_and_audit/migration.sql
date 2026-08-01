-- Migration: 002_add_consent_and_audit
-- Adds consent_records and audit_events tables per LLD §7.3 and task spec.

CREATE TYPE "ConsentType" AS ENUM ('terms_and_privacy', 'marketing', 'personalization');

CREATE TABLE "consent_records" (
    "id"                  UUID          NOT NULL DEFAULT gen_random_uuid(),
    "user_id"             VARCHAR(128),
    "session_id"          VARCHAR(128)  NOT NULL,
    "consent_type"        "ConsentType" NOT NULL,
    "granted"             BOOLEAN       NOT NULL,
    "purpose_description" TEXT,
    "ip_address"          VARCHAR(64),
    "user_agent"          VARCHAR(512),
    "created_at"          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consent_records_user_id_idx"    ON "consent_records" ("user_id");
CREATE INDEX "consent_records_session_id_idx" ON "consent_records" ("session_id");

CREATE TABLE "audit_events" (
    "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
    "event_type"  VARCHAR(64) NOT NULL,
    "entity_id"   VARCHAR(128),
    "entity_type" VARCHAR(64),
    "actor_id"    VARCHAR(128),
    "payload"     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_events_entity_id_idx"  ON "audit_events" ("entity_id");
CREATE INDEX "audit_events_created_at_idx" ON "audit_events" ("created_at");
