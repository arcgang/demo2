import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for GET /api/cart/summary
 *
 * Contract (task spec):
 *   On cart load, the endpoint reads the active upgrade session (upgrade_sid cookie).
 *   Response shape CartSummaryResponse:
 *     onceOff: {
 *       device: number,
 *       accessories: number,
 *       activationFee: number,
 *       subtotal: number,          // device + accessories + activationFee
 *       vat: number,               // 15% of subtotal
 *       tradeInCredit?: number,    // negative — present only when tradeIn in session
 *       total: number              // subtotal + vat + tradeInCredit (credit reduces total)
 *     },
 *     recurring: {
 *       plan: number,
 *       monthlySubtotal: number
 *     },
 *     financing?: {               // present when financing in session
 *       monthlyAmount: number,
 *       termMonths: number,
 *       asyncPending: boolean
 *     },
 *     notices: Array<{ field: string; message: string }>
 *       — one notice per component whose asyncPending === true
 *
 *   'Apply Credit to Order' UI action PUTs tradeIn into the upgrade session;
 *   a subsequent GET /api/cart/summary immediately reflects the credit.
 *
 *   The checkout order summary panel uses the same endpoint data; tests under
 *   "checkout parity" verify that the same session-driven credit and financing
 *   values appear.
 */

// ---------------------------------------------------------------------------
// Response type shapes
// ---------------------------------------------------------------------------

interface OnceOff {
  device: number;
  accessories: number;
  activationFee: number;
  subtotal: number;
  vat: number;
  tradeInCredit?: number;
  total: number;
}

interface Recurring {
  plan: number;
  monthlySubtotal: number;
}

interface FinancingSummary {
  monthlyAmount: number;
  termMonths: number;
  asyncPending: boolean;
}

interface SummaryNotice {
  field: string;
  message: string;
}

interface CartSummaryResponse {
  onceOff: OnceOff;
  recurring: Recurring;
  financing?: FinancingSummary;
  notices: SummaryNotice[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

async function getCartSummary(
  agent: ReturnType<typeof request.agent>,
): Promise<{ status: number; body: unknown }> {
  const res = await agent.get('/api/cart/summary');
  return { status: res.status, body: res.body };
}

async function putUpgradeSession(
  agent: ReturnType<typeof request.agent>,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const res = await agent
    .put('/api/upgrade/session')
    .set('Content-Type', 'application/json')
    .send(payload);
  return { status: res.status, body: res.body };
}

// Standard cart line items used throughout (matches wireframe_cart.html values)
const STANDARD_LINE_ITEMS = {
  device: 18999.00,
  accessories: 998.00,
  activationFee: 0.00,
  plan: 799.00,
};
const SUBTOTAL = STANDARD_LINE_ITEMS.device + STANDARD_LINE_ITEMS.accessories + STANDARD_LINE_ITEMS.activationFee; // 19997.00
const VAT_RATE = 0.15;
const VAT_ON_SUBTOTAL = Math.round(SUBTOTAL * VAT_RATE * 100) / 100; // 2999.55
const TRADE_IN_CREDIT = 2500.00;
const TOTAL_WITH_CREDIT = SUBTOTAL + VAT_ON_SUBTOTAL - TRADE_IN_CREDIT; // 20496.55

// ---------------------------------------------------------------------------
// AC-1  GET /api/cart/summary — endpoint exists and returns 200
// ---------------------------------------------------------------------------

describe('GET /api/cart/summary — endpoint availability', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('returns HTTP 200 (not 404)', async () => {
    const agent = request.agent(app);
    const res = await getCartSummary(agent);
    expect(res.status).toBe(200);
  });

  it('returns JSON content-type', async () => {
    const agent = request.agent(app);
    const raw = await agent.get('/api/cart/summary');
    expect(raw.headers['content-type']).toMatch(/application\/json/);
  });
});

// ---------------------------------------------------------------------------
// AC-2  GET /api/cart/summary — response shape (no upgrade session)
// ---------------------------------------------------------------------------

describe('GET /api/cart/summary — base response shape without upgrade session', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    const agent = request.agent(app);
    result = await getCartSummary(agent);
  });

  it('response contains onceOff object', () => {
    const body = result.body as CartSummaryResponse;
    expect(body).toHaveProperty('onceOff');
    expect(typeof body.onceOff).toBe('object');
  });

  it('onceOff contains device as a non-negative number', () => {
    const body = result.body as CartSummaryResponse;
    expect(typeof body.onceOff.device).toBe('number');
    expect(body.onceOff.device).toBeGreaterThanOrEqual(0);
  });

  it('onceOff contains accessories as a non-negative number', () => {
    const body = result.body as CartSummaryResponse;
    expect(typeof body.onceOff.accessories).toBe('number');
    expect(body.onceOff.accessories).toBeGreaterThanOrEqual(0);
  });

  it('onceOff contains activationFee as a non-negative number', () => {
    const body = result.body as CartSummaryResponse;
    expect(typeof body.onceOff.activationFee).toBe('number');
    expect(body.onceOff.activationFee).toBeGreaterThanOrEqual(0);
  });

  it('onceOff contains subtotal as a non-negative number', () => {
    const body = result.body as CartSummaryResponse;
    expect(typeof body.onceOff.subtotal).toBe('number');
    expect(body.onceOff.subtotal).toBeGreaterThanOrEqual(0);
  });

  it('onceOff contains vat as a non-negative number', () => {
    const body = result.body as CartSummaryResponse;
    expect(typeof body.onceOff.vat).toBe('number');
    expect(body.onceOff.vat).toBeGreaterThanOrEqual(0);
  });

  it('onceOff contains total as a non-negative number', () => {
    const body = result.body as CartSummaryResponse;
    expect(typeof body.onceOff.total).toBe('number');
    expect(body.onceOff.total).toBeGreaterThanOrEqual(0);
  });

  it('response contains recurring object', () => {
    const body = result.body as CartSummaryResponse;
    expect(body).toHaveProperty('recurring');
    expect(typeof body.recurring).toBe('object');
  });

  it('recurring contains plan as a number', () => {
    const body = result.body as CartSummaryResponse;
    expect(typeof body.recurring.plan).toBe('number');
  });

  it('recurring contains monthlySubtotal as a number', () => {
    const body = result.body as CartSummaryResponse;
    expect(typeof body.recurring.monthlySubtotal).toBe('number');
  });

  it('response contains notices as an array', () => {
    const body = result.body as CartSummaryResponse;
    expect(body).toHaveProperty('notices');
    expect(Array.isArray(body.notices)).toBe(true);
  });

  it('tradeInCredit is absent when no trade-in session is active', () => {
    const body = result.body as CartSummaryResponse;
    expect(body.onceOff.tradeInCredit).toBeUndefined();
  });

  it('financing is absent when no financing session is active', () => {
    const body = result.body as CartSummaryResponse;
    expect(body.financing).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AC-3  VAT calculation — 15% of subtotal (device + accessories + activationFee)
// ---------------------------------------------------------------------------

describe('GET /api/cart/summary — VAT calculation correctness', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('onceOff.subtotal equals device + accessories + activationFee', async () => {
    const agent = request.agent(app);
    const { body } = await getCartSummary(agent);
    const s = (body as CartSummaryResponse).onceOff;
    expect(s.subtotal).toBeCloseTo(s.device + s.accessories + s.activationFee, 2);
  });

  it('onceOff.vat is 15% of subtotal (rounded to 2dp)', async () => {
    const agent = request.agent(app);
    const { body } = await getCartSummary(agent);
    const s = (body as CartSummaryResponse).onceOff;
    const expectedVat = Math.round(s.subtotal * 0.15 * 100) / 100;
    expect(s.vat).toBeCloseTo(expectedVat, 2);
  });

  it('onceOff.total equals subtotal + vat when no trade-in credit is active', async () => {
    const agent = request.agent(app);
    const { body } = await getCartSummary(agent);
    const s = (body as CartSummaryResponse).onceOff;
    expect(s.total).toBeCloseTo(s.subtotal + s.vat, 2);
  });
});

// ---------------------------------------------------------------------------
// AC-4  Trade-In Credit — applied when tradeIn is set in upgrade session
// ---------------------------------------------------------------------------

describe('GET /api/cart/summary — trade-in credit from upgrade session', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('tradeInCredit line appears when session has tradeIn.estimatedCredit', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: TRADE_IN_CREDIT, brand: 'Apple', asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const s = (body as CartSummaryResponse).onceOff;
    expect(s.tradeInCredit).toBeDefined();
  });

  it('tradeInCredit value is the negative of the estimatedCredit from the session', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: TRADE_IN_CREDIT, brand: 'Apple', asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const s = (body as CartSummaryResponse).onceOff;
    // Credit reduces the total: stored as negative or used to reduce total
    expect(Math.abs(s.tradeInCredit as number)).toBeCloseTo(TRADE_IN_CREDIT, 2);
  });

  it('onceOff.total is reduced by the trade-in credit amount', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: TRADE_IN_CREDIT, brand: 'Apple', asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const s = (body as CartSummaryResponse).onceOff;
    // total = subtotal + vat - credit
    const expectedTotal = s.subtotal + s.vat - TRADE_IN_CREDIT;
    expect(s.total).toBeCloseTo(expectedTotal, 2);
  });

  it('total is lower with trade-in credit than without', async () => {
    const agentNoCredit = request.agent(app);
    const agentWithCredit = request.agent(app);

    const { body: noCredit } = await getCartSummary(agentNoCredit);
    await putUpgradeSession(agentWithCredit, {
      tradeIn: { estimatedCredit: TRADE_IN_CREDIT, asyncPending: true },
    });
    const { body: withCredit } = await getCartSummary(agentWithCredit);

    const totalA = (noCredit as CartSummaryResponse).onceOff.total;
    const totalB = (withCredit as CartSummaryResponse).onceOff.total;
    expect(totalB).toBeLessThan(totalA);
  });

  it('tradeInCredit is absent again after session tradeIn is cleared', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: TRADE_IN_CREDIT, asyncPending: true },
    });
    // Clear tradeIn from session
    await putUpgradeSession(agent, { tradeIn: null });
    const { body } = await getCartSummary(agent);
    const s = (body as CartSummaryResponse).onceOff;
    expect(s.tradeInCredit).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AC-5  VAT recalculates correctly when trade-in credit changes
// ---------------------------------------------------------------------------

describe('GET /api/cart/summary — VAT is unaffected by trade-in credit (credit is post-VAT)', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('VAT amount is the same with or without a trade-in credit applied', async () => {
    const agentNoCredit = request.agent(app);
    const agentWithCredit = request.agent(app);

    const { body: noCredit } = await getCartSummary(agentNoCredit);
    await putUpgradeSession(agentWithCredit, {
      tradeIn: { estimatedCredit: TRADE_IN_CREDIT, asyncPending: true },
    });
    const { body: withCredit } = await getCartSummary(agentWithCredit);

    const vatA = (noCredit as CartSummaryResponse).onceOff.vat;
    const vatB = (withCredit as CartSummaryResponse).onceOff.vat;
    // VAT is calculated on the pre-credit subtotal; credit is applied post-VAT
    expect(vatB).toBeCloseTo(vatA, 2);
  });
});

// ---------------------------------------------------------------------------
// AC-6  Financing — monthly breakdown from session
// ---------------------------------------------------------------------------

describe('GET /api/cart/summary — financing from upgrade session', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('financing block appears in response when session has financing data', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      financing: { monthlyAmount: 899.00, termMonths: 24, asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    expect((body as CartSummaryResponse).financing).toBeDefined();
  });

  it('financing.monthlyAmount matches the session value', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      financing: { monthlyAmount: 899.00, termMonths: 24, asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const f = (body as CartSummaryResponse).financing as FinancingSummary;
    expect(f.monthlyAmount).toBeCloseTo(899.00, 2);
  });

  it('financing.termMonths matches the session value', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      financing: { monthlyAmount: 899.00, termMonths: 24, asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const f = (body as CartSummaryResponse).financing as FinancingSummary;
    expect(f.termMonths).toBe(24);
  });

  it('financing.asyncPending is present as a boolean', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      financing: { monthlyAmount: 899.00, termMonths: 24, asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const f = (body as CartSummaryResponse).financing as FinancingSummary;
    expect(typeof f.asyncPending).toBe('boolean');
  });

  it('financing is absent when no financing key in session', async () => {
    const agent = request.agent(app);
    const { body } = await getCartSummary(agent);
    expect((body as CartSummaryResponse).financing).toBeUndefined();
  });

  it('different financing terms produce different monthlyAmount values in the summary', async () => {
    const agentA = request.agent(app);
    const agentB = request.agent(app);
    await putUpgradeSession(agentA, {
      financing: { monthlyAmount: 899.00, termMonths: 24, asyncPending: true },
    });
    await putUpgradeSession(agentB, {
      financing: { monthlyAmount: 1549.00, termMonths: 12, asyncPending: false },
    });
    const { body: bodyA } = await getCartSummary(agentA);
    const { body: bodyB } = await getCartSummary(agentB);
    const fA = (bodyA as CartSummaryResponse).financing as FinancingSummary;
    const fB = (bodyB as CartSummaryResponse).financing as FinancingSummary;
    expect(fA.monthlyAmount).not.toBeCloseTo(fB.monthlyAmount, 2);
  });
});

// ---------------------------------------------------------------------------
// AC-7  asyncPending notices — inline contextual notice per pending component
// ---------------------------------------------------------------------------

describe('GET /api/cart/summary — asyncPending notices', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('a notice appears in the notices array when tradeIn.asyncPending is true', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: 2500, asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const notices = (body as CartSummaryResponse).notices;
    const tradeInNotice = notices.find((n) => n.field === 'tradeInCredit');
    expect(tradeInNotice).toBeDefined();
  });

  it('the trade-in notice message is a non-empty string', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: 2500, asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const notices = (body as CartSummaryResponse).notices;
    const tradeInNotice = notices.find((n) => n.field === 'tradeInCredit');
    expect(typeof tradeInNotice?.message).toBe('string');
    expect((tradeInNotice?.message ?? '').length).toBeGreaterThan(0);
  });

  it('the trade-in notice message mentions inspection or confirmation', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: 2500, asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const notices = (body as CartSummaryResponse).notices;
    const tradeInNotice = notices.find((n) => n.field === 'tradeInCredit');
    const msg = (tradeInNotice?.message ?? '').toLowerCase();
    expect(msg.includes('inspection') || msg.includes('confirm')).toBe(true);
  });

  it('a notice appears for financing when financing.asyncPending is true', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      financing: { monthlyAmount: 899.00, termMonths: 24, asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const notices = (body as CartSummaryResponse).notices;
    const financingNotice = notices.find((n) => n.field === 'financing');
    expect(financingNotice).toBeDefined();
  });

  it('no trade-in notice when tradeIn.asyncPending is false', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: 2500, asyncPending: false },
    });
    const { body } = await getCartSummary(agent);
    const notices = (body as CartSummaryResponse).notices;
    const tradeInNotice = notices.find((n) => n.field === 'tradeInCredit');
    expect(tradeInNotice).toBeUndefined();
  });

  it('no financing notice when financing.asyncPending is false', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      financing: { monthlyAmount: 1549.00, termMonths: 12, asyncPending: false },
    });
    const { body } = await getCartSummary(agent);
    const notices = (body as CartSummaryResponse).notices;
    const financingNotice = notices.find((n) => n.field === 'financing');
    expect(financingNotice).toBeUndefined();
  });

  it('notices array is empty when no upgrade session components are pending', async () => {
    const agent = request.agent(app);
    const { body } = await getCartSummary(agent);
    expect((body as CartSummaryResponse).notices).toHaveLength(0);
  });

  it('notices array contains two entries when both tradeIn and financing are asyncPending', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: 2500, asyncPending: true },
      financing: { monthlyAmount: 899.00, termMonths: 24, asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const notices = (body as CartSummaryResponse).notices;
    expect(notices.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// AC-8  'Apply Credit to Order' — PUT /api/upgrade/session with tradeIn triggers
//        immediate cart summary refresh
// ---------------------------------------------------------------------------

describe('"Apply Credit to Order" — session-state-driven cart refresh', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('summary has no tradeInCredit before the Apply Credit action', async () => {
    const agent = request.agent(app);
    const { body } = await getCartSummary(agent);
    expect((body as CartSummaryResponse).onceOff.tradeInCredit).toBeUndefined();
  });

  it('summary reflects tradeInCredit immediately after PUT session with tradeIn data', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: 2500, brand: 'Apple', model: 'iPhone 12', asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const s = (body as CartSummaryResponse).onceOff;
    expect(s.tradeInCredit).toBeDefined();
    expect(Math.abs(s.tradeInCredit as number)).toBeCloseTo(2500, 2);
  });

  it('once-off total is immediately consistent with the applied credit', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: 2500, brand: 'Apple', asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const s = (body as CartSummaryResponse).onceOff;
    const expectedTotal = s.subtotal + s.vat - 2500;
    expect(s.total).toBeCloseTo(expectedTotal, 2);
  });

  it('applying a different credit amount updates the total correctly', async () => {
    const agent = request.agent(app);

    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: 1000, asyncPending: false },
    });
    const { body: first } = await getCartSummary(agent);
    const totalFirst = (first as CartSummaryResponse).onceOff.total;

    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: 3000, asyncPending: false },
    });
    const { body: second } = await getCartSummary(agent);
    const totalSecond = (second as CartSummaryResponse).onceOff.total;

    expect(totalSecond).toBeLessThan(totalFirst);
  });
});

// ---------------------------------------------------------------------------
// AC-9  Checkout order summary parity — same session values appear in summary
//        (checkout panel uses GET /api/cart/summary; these tests confirm the
//        data is sufficient to render the checkout order summary as specified
//        in wireframe_checkout_payment.html)
// ---------------------------------------------------------------------------

describe('Checkout order summary parity — data sufficient for checkout panel', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('response includes all fields required by the checkout order summary panel', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: 2500, asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const s = body as CartSummaryResponse;
    // Checkout panel must render: line items, once-off subtotal, monthly plan,
    // VAT, trade-in credit, total once-off, monthly total
    expect(s.onceOff).toHaveProperty('subtotal');
    expect(s.onceOff).toHaveProperty('vat');
    expect(s.onceOff).toHaveProperty('tradeInCredit');
    expect(s.onceOff).toHaveProperty('total');
    expect(s.recurring).toHaveProperty('monthlySubtotal');
  });

  it('checkout total once-off matches R 20,496.55 with standard wireframe values and R 2,500 credit', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: 2500, asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const s = (body as CartSummaryResponse).onceOff;
    // R 19,997.00 subtotal + R 2,999.55 VAT - R 2,500.00 credit = R 20,496.55
    expect(s.total).toBeCloseTo(20496.55, 2);
  });

  it('checkout asyncPending notice does not block the summary response', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: 2500, asyncPending: true },
      financing: { monthlyAmount: 899, termMonths: 24, asyncPending: true },
    });
    const { status, body } = await getCartSummary(agent);
    // Pending components must not block the response — 200 is returned with notices
    expect(status).toBe(200);
    expect((body as CartSummaryResponse).notices.length).toBeGreaterThan(0);
    expect((body as CartSummaryResponse).onceOff.total).toBeGreaterThan(0);
  });

  it('checkout summary includes financing monthly amount when financing session is active', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      financing: { monthlyAmount: 899.00, termMonths: 24, asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const f = (body as CartSummaryResponse).financing as FinancingSummary;
    expect(f).toBeDefined();
    expect(f.monthlyAmount).toBeCloseTo(899.00, 2);
    expect(f.termMonths).toBe(24);
  });

  it('both trade-in credit and financing can coexist in checkout summary', async () => {
    const agent = request.agent(app);
    await putUpgradeSession(agent, {
      tradeIn: { estimatedCredit: 2500, asyncPending: true },
      financing: { monthlyAmount: 899.00, termMonths: 24, asyncPending: true },
    });
    const { body } = await getCartSummary(agent);
    const s = body as CartSummaryResponse;
    expect(s.onceOff.tradeInCredit).toBeDefined();
    expect(s.financing).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AC-10  Session isolation — different sessions see independent summaries
// ---------------------------------------------------------------------------

describe('GET /api/cart/summary — session isolation', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('trade-in credit applied in session A does not appear in session B', async () => {
    const agentA = request.agent(app);
    const agentB = request.agent(app);

    await putUpgradeSession(agentA, {
      tradeIn: { estimatedCredit: 2500, asyncPending: true },
    });

    const { body: bodyB } = await getCartSummary(agentB);
    const sB = (bodyB as CartSummaryResponse).onceOff;
    expect(sB.tradeInCredit).toBeUndefined();
  });

  it('financing set in session A does not bleed into session B', async () => {
    const agentA = request.agent(app);
    const agentB = request.agent(app);

    await putUpgradeSession(agentA, {
      financing: { monthlyAmount: 899.00, termMonths: 24, asyncPending: true },
    });

    const { body: bodyB } = await getCartSummary(agentB);
    expect((bodyB as CartSummaryResponse).financing).toBeUndefined();
  });
});
