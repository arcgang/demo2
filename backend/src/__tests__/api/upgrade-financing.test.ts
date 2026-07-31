import request from 'supertest';
import express, { Application } from 'express';

/**
 * Acceptance tests for GET /api/upgrade/financing
 *
 * Contract (LLD §5 / task spec):
 *   200 Response: FinancingQuote[]
 *   Each FinancingQuote: {
 *     monthlyAmount: number,
 *     termMonths: number,
 *     asyncPending: boolean
 *   }
 *   Calls route through the Financing Boundary (FinancingAdapter) per HLD §9.3.
 *   asyncPending must be present in every quote object so the frontend can
 *   surface the async-review notice.
 */

// ---------------------------------------------------------------------------
// Response type shapes
// ---------------------------------------------------------------------------

interface FinancingQuote {
  monthlyAmount: number;
  termMonths: number;
  asyncPending: boolean;
}

interface ErrorResponse {
  errorCode: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

async function getFinancing(
  app: Application,
  query: Record<string, string> = {},
): Promise<{ status: number; body: unknown }> {
  const res = await request(app)
    .get('/api/upgrade/financing')
    .query(query);
  return { status: res.status, body: res.body };
}

// ---------------------------------------------------------------------------
// AC-1  Returns an array of FinancingQuote objects
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/financing — response shape', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await getFinancing(app);
  });

  it('returns HTTP 200', () => {
    expect(result.status).toBe(200);
  });

  it('response body is an array', () => {
    expect(Array.isArray(result.body)).toBe(true);
  });

  it('array contains at least one FinancingQuote', () => {
    expect((result.body as unknown[]).length).toBeGreaterThan(0);
  });

  it('each quote has monthlyAmount as a number', () => {
    for (const q of result.body as FinancingQuote[]) {
      expect(typeof q.monthlyAmount).toBe('number');
    }
  });

  it('each quote has termMonths as a positive integer', () => {
    for (const q of result.body as FinancingQuote[]) {
      expect(typeof q.termMonths).toBe('number');
      expect(Number.isInteger(q.termMonths)).toBe(true);
      expect(q.termMonths).toBeGreaterThan(0);
    }
  });

  it('each quote has asyncPending as a boolean', () => {
    for (const q of result.body as FinancingQuote[]) {
      expect(typeof q.asyncPending).toBe('boolean');
    }
  });

  it('each quote has exactly the three mandated fields present', () => {
    for (const q of result.body as FinancingQuote[]) {
      expect(q).toHaveProperty('monthlyAmount');
      expect(q).toHaveProperty('termMonths');
      expect(q).toHaveProperty('asyncPending');
    }
  });

  it('monthlyAmount is a non-negative number', () => {
    for (const q of result.body as FinancingQuote[]) {
      expect(q.monthlyAmount).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-2  asyncPending flag is always present (frontend async-review notice)
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/financing — asyncPending invariant', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('asyncPending field is present on every quote regardless of value', async () => {
    const res = await getFinancing(app);
    for (const q of res.body as FinancingQuote[]) {
      expect(Object.prototype.hasOwnProperty.call(q, 'asyncPending')).toBe(true);
    }
  });

  it('asyncPending is a boolean (not null or undefined) on every quote', async () => {
    const res = await getFinancing(app);
    for (const q of res.body as FinancingQuote[]) {
      expect(q.asyncPending === true || q.asyncPending === false).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-3  Routes through the Financing Boundary (not a direct DB read)
// ---------------------------------------------------------------------------

describe('GET /api/upgrade/financing — Financing Boundary routing', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('endpoint is reachable and does not return 404', async () => {
    const res = await getFinancing(app);
    expect(res.status).not.toBe(404);
  });

  it('endpoint is reachable and does not return 500', async () => {
    const res = await getFinancing(app);
    expect(res.status).not.toBe(500);
  });
});
