import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for POST /api/orders/:id/esim/issue
 *
 * Acceptance criteria (from task + LLD §6.3, §10):
 *   AC-1  Returns HTTP 403 + errorCode=PAYMENT_PENDING when payment is not confirmed.
 *   AC-2  Returns HTTP 403 + errorCode=VERIFICATION_PENDING when verification is not passed.
 *   AC-3  Returns HTTP 200 with eSIM activation code and SM-DP+ address when both gates pass.
 *   AC-4  An audit event is written for every issuance attempt (success and failure).
 */

// These types mirror what the implementation module must export.
interface OrderSeed {
  paymentStatus: string;
  verificationStatus: string;
}

interface PersistedActivationStatus {
  orderId: string;
  activationState: string;
  esimReference?: string;
}

interface PersistedAuditEvent {
  orderId: string;
  eventCategory: string;
  eventType: string;
}

import {
  clearAll,
  seedOrder,
  getAuditEvents,
  getActivationStatuses,
} from '../../modules/activation/activationStore';

// ─── constants ───────────────────────────────────────────────────────────────

const PAYMENT_CONFIRMED      = 'CONFIRMED';
const PAYMENT_PENDING        = 'PENDING';
const VERIFICATION_COMPLETED = 'COMPLETED';
const VERIFICATION_PENDING   = 'PENDING_REVIEW';

const ORDER_PAYMENT_OK_VERIFICATION_OK = 'ord_both_pass';
const ORDER_PAYMENT_FAIL               = 'ord_pay_fail';
const ORDER_VERIFICATION_FAIL          = 'ord_ver_fail';
const ORDER_BOTH_FAIL                  = 'ord_both_fail';
const ORDER_NOT_FOUND                  = 'ord_nonexistent';

// ─── app factory ─────────────────────────────────────────────────────────────

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

// ─── helpers ─────────────────────────────────────────────────────────────────

async function issueEsim(
  app: Application,
  orderId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await request(app).post(`/api/orders/${orderId}/esim/issue`);
  return { status: res.status, body: res.body as Record<string, unknown> };
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  Payment gate — returns 403 PAYMENT_PENDING when payment not confirmed
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/orders/:id/esim/issue — AC-1 payment gate', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  it('returns HTTP 403 when payment status is not CONFIRMED', async () => {
    seedOrder(ORDER_PAYMENT_FAIL, {
      paymentStatus: PAYMENT_PENDING,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    const { status } = await issueEsim(app, ORDER_PAYMENT_FAIL);
    expect(status).toBe(403);
  });

  it('returns errorCode PAYMENT_PENDING in the response body', async () => {
    seedOrder(ORDER_PAYMENT_FAIL, {
      paymentStatus: PAYMENT_PENDING,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    const { body } = await issueEsim(app, ORDER_PAYMENT_FAIL);
    expect(body.errorCode).toBe('PAYMENT_PENDING');
  });

  it('response body includes a human-readable message when payment gate fails', async () => {
    seedOrder(ORDER_PAYMENT_FAIL, {
      paymentStatus: PAYMENT_PENDING,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    const { body } = await issueEsim(app, ORDER_PAYMENT_FAIL);
    expect(typeof body.message).toBe('string');
    expect((body.message as string).length).toBeGreaterThan(0);
  });

  it('does NOT return an eSIM activation code when payment gate fails', async () => {
    seedOrder(ORDER_PAYMENT_FAIL, {
      paymentStatus: PAYMENT_PENDING,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    const { body } = await issueEsim(app, ORDER_PAYMENT_FAIL);
    expect(body.activationCode).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  Verification gate — returns 403 VERIFICATION_PENDING when KYC not passed
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/orders/:id/esim/issue — AC-2 verification gate', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  it('returns HTTP 403 when verification status is not COMPLETED', async () => {
    seedOrder(ORDER_VERIFICATION_FAIL, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_PENDING,
    } as OrderSeed);

    const { status } = await issueEsim(app, ORDER_VERIFICATION_FAIL);
    expect(status).toBe(403);
  });

  it('returns errorCode VERIFICATION_PENDING in the response body', async () => {
    seedOrder(ORDER_VERIFICATION_FAIL, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_PENDING,
    } as OrderSeed);

    const { body } = await issueEsim(app, ORDER_VERIFICATION_FAIL);
    expect(body.errorCode).toBe('VERIFICATION_PENDING');
  });

  it('response body includes a human-readable message when verification gate fails', async () => {
    seedOrder(ORDER_VERIFICATION_FAIL, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_PENDING,
    } as OrderSeed);

    const { body } = await issueEsim(app, ORDER_VERIFICATION_FAIL);
    expect(typeof body.message).toBe('string');
    expect((body.message as string).length).toBeGreaterThan(0);
  });

  it('does NOT return an eSIM activation code when verification gate fails', async () => {
    seedOrder(ORDER_VERIFICATION_FAIL, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_PENDING,
    } as OrderSeed);

    const { body } = await issueEsim(app, ORDER_VERIFICATION_FAIL);
    expect(body.activationCode).toBeUndefined();
  });

  it('returns PAYMENT_PENDING (not VERIFICATION_PENDING) when both gates fail — payment checked first', async () => {
    seedOrder(ORDER_BOTH_FAIL, {
      paymentStatus: PAYMENT_PENDING,
      verificationStatus: VERIFICATION_PENDING,
    } as OrderSeed);

    const { status, body } = await issueEsim(app, ORDER_BOTH_FAIL);
    expect(status).toBe(403);
    expect(body.errorCode).toBe('PAYMENT_PENDING');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  Success — both gates pass, eSIM activation code and SM-DP+ returned
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/orders/:id/esim/issue — AC-3 success path', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  it('returns HTTP 200 when both payment and verification gates pass', async () => {
    seedOrder(ORDER_PAYMENT_OK_VERIFICATION_OK, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    const { status } = await issueEsim(app, ORDER_PAYMENT_OK_VERIFICATION_OK);
    expect(status).toBe(200);
  });

  it('response includes the orderId matching the path parameter', async () => {
    seedOrder(ORDER_PAYMENT_OK_VERIFICATION_OK, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    const { body } = await issueEsim(app, ORDER_PAYMENT_OK_VERIFICATION_OK);
    expect(body.orderId).toBe(ORDER_PAYMENT_OK_VERIFICATION_OK);
  });

  it('response includes an activationCode in LPA URI format', async () => {
    seedOrder(ORDER_PAYMENT_OK_VERIFICATION_OK, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    const { body } = await issueEsim(app, ORDER_PAYMENT_OK_VERIFICATION_OK);
    expect(typeof body.activationCode).toBe('string');
    expect((body.activationCode as string).startsWith('LPA:')).toBe(true);
  });

  it('activationCode contains an SM-DP+ address component', async () => {
    seedOrder(ORDER_PAYMENT_OK_VERIFICATION_OK, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    const { body } = await issueEsim(app, ORDER_PAYMENT_OK_VERIFICATION_OK);
    // LPA format:  LPA:1$<smdp-address>$<matching-id>
    const parts = (body.activationCode as string).split('$');
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it('response includes a smdpAddress field', async () => {
    seedOrder(ORDER_PAYMENT_OK_VERIFICATION_OK, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    const { body } = await issueEsim(app, ORDER_PAYMENT_OK_VERIFICATION_OK);
    expect(typeof body.smdpAddress).toBe('string');
    expect((body.smdpAddress as string).length).toBeGreaterThan(0);
  });

  it('smdpAddress in response matches the SM-DP+ address component in activationCode', async () => {
    seedOrder(ORDER_PAYMENT_OK_VERIFICATION_OK, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    const { body } = await issueEsim(app, ORDER_PAYMENT_OK_VERIFICATION_OK);
    const smdpFromCode = (body.activationCode as string).split('$')[1];
    expect(body.smdpAddress).toBe(smdpFromCode);
  });

  it('response includes activationState ESIM_ISSUED', async () => {
    seedOrder(ORDER_PAYMENT_OK_VERIFICATION_OK, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    const { body } = await issueEsim(app, ORDER_PAYMENT_OK_VERIFICATION_OK);
    expect(body.activationState).toBe('ESIM_ISSUED');
  });

  it('persists an ActivationStatus record linked to the order', async () => {
    seedOrder(ORDER_PAYMENT_OK_VERIFICATION_OK, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    await issueEsim(app, ORDER_PAYMENT_OK_VERIFICATION_OK);

    const statuses = getActivationStatuses() as PersistedActivationStatus[];
    const persisted = statuses.find((s) => s.orderId === ORDER_PAYMENT_OK_VERIFICATION_OK);
    expect(persisted).toBeDefined();
    expect(persisted?.activationState).toBe('ESIM_ISSUED');
  });

  it('persisted ActivationStatus includes the esim reference', async () => {
    seedOrder(ORDER_PAYMENT_OK_VERIFICATION_OK, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    await issueEsim(app, ORDER_PAYMENT_OK_VERIFICATION_OK);

    const statuses = getActivationStatuses() as PersistedActivationStatus[];
    const persisted = statuses.find((s) => s.orderId === ORDER_PAYMENT_OK_VERIFICATION_OK);
    expect(typeof persisted?.esimReference).toBe('string');
    expect((persisted?.esimReference as string).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  Audit events — written for every issuance attempt
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/orders/:id/esim/issue — AC-4 audit events', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  it('writes an audit event when the payment gate blocks issuance', async () => {
    seedOrder(ORDER_PAYMENT_FAIL, {
      paymentStatus: PAYMENT_PENDING,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    await issueEsim(app, ORDER_PAYMENT_FAIL);

    const events = getAuditEvents() as PersistedAuditEvent[];
    const related = events.filter((e) => e.orderId === ORDER_PAYMENT_FAIL);
    expect(related.length).toBeGreaterThanOrEqual(1);
  });

  it('audit event for payment gate failure has eventCategory ACTIVATION', async () => {
    seedOrder(ORDER_PAYMENT_FAIL, {
      paymentStatus: PAYMENT_PENDING,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    await issueEsim(app, ORDER_PAYMENT_FAIL);

    const events = getAuditEvents() as PersistedAuditEvent[];
    const related = events.filter((e) => e.orderId === ORDER_PAYMENT_FAIL);
    expect(related.some((e) => e.eventCategory === 'ACTIVATION')).toBe(true);
  });

  it('writes an audit event when the verification gate blocks issuance', async () => {
    seedOrder(ORDER_VERIFICATION_FAIL, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_PENDING,
    } as OrderSeed);

    await issueEsim(app, ORDER_VERIFICATION_FAIL);

    const events = getAuditEvents() as PersistedAuditEvent[];
    const related = events.filter((e) => e.orderId === ORDER_VERIFICATION_FAIL);
    expect(related.length).toBeGreaterThanOrEqual(1);
  });

  it('audit event for verification gate failure has eventCategory ACTIVATION', async () => {
    seedOrder(ORDER_VERIFICATION_FAIL, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_PENDING,
    } as OrderSeed);

    await issueEsim(app, ORDER_VERIFICATION_FAIL);

    const events = getAuditEvents() as PersistedAuditEvent[];
    const related = events.filter((e) => e.orderId === ORDER_VERIFICATION_FAIL);
    expect(related.some((e) => e.eventCategory === 'ACTIVATION')).toBe(true);
  });

  it('writes an audit event on successful eSIM issuance', async () => {
    seedOrder(ORDER_PAYMENT_OK_VERIFICATION_OK, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    await issueEsim(app, ORDER_PAYMENT_OK_VERIFICATION_OK);

    const events = getAuditEvents() as PersistedAuditEvent[];
    const related = events.filter((e) => e.orderId === ORDER_PAYMENT_OK_VERIFICATION_OK);
    expect(related.length).toBeGreaterThanOrEqual(1);
  });

  it('success audit event has eventCategory ACTIVATION', async () => {
    seedOrder(ORDER_PAYMENT_OK_VERIFICATION_OK, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    await issueEsim(app, ORDER_PAYMENT_OK_VERIFICATION_OK);

    const events = getAuditEvents() as PersistedAuditEvent[];
    const related = events.filter((e) => e.orderId === ORDER_PAYMENT_OK_VERIFICATION_OK);
    expect(related.some((e) => e.eventCategory === 'ACTIVATION')).toBe(true);
  });

  it('every audit event written for an order references that orderId', async () => {
    seedOrder(ORDER_PAYMENT_OK_VERIFICATION_OK, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    await issueEsim(app, ORDER_PAYMENT_OK_VERIFICATION_OK);

    const events = getAuditEvents() as PersistedAuditEvent[];
    const related = events.filter((e) => e.orderId === ORDER_PAYMENT_OK_VERIFICATION_OK);
    expect(related.length).toBeGreaterThan(0);
    for (const e of related) {
      expect(e.orderId).toBe(ORDER_PAYMENT_OK_VERIFICATION_OK);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/orders/:id/esim/issue — edge cases', () => {
  let app: Application;

  beforeEach(() => {
    clearAll();
    app = getApp();
  });

  it('returns HTTP 404 when the order does not exist', async () => {
    const { status } = await issueEsim(app, ORDER_NOT_FOUND);
    expect(status).toBe(404);
  });

  it('404 response includes a machine-readable errorCode', async () => {
    const { body } = await issueEsim(app, ORDER_NOT_FOUND);
    expect(typeof body.errorCode).toBe('string');
    expect((body.errorCode as string).length).toBeGreaterThan(0);
  });

  it('calling issue twice for the same order returns 200 (idempotent) or 409 (already issued) — never 5xx', async () => {
    seedOrder(ORDER_PAYMENT_OK_VERIFICATION_OK, {
      paymentStatus: PAYMENT_CONFIRMED,
      verificationStatus: VERIFICATION_COMPLETED,
    } as OrderSeed);

    const first = await issueEsim(app, ORDER_PAYMENT_OK_VERIFICATION_OK);
    expect(first.status).toBe(200);

    const second = await issueEsim(app, ORDER_PAYMENT_OK_VERIFICATION_OK);
    expect([200, 409]).toContain(second.status);
  });
});
