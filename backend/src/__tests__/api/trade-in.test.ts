import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for:
 *   POST /api/trade-in/quote
 *   POST /api/cart/trade-in
 *
 * Contract (from task spec):
 *   POST /api/trade-in/quote
 *     Request:  { brand, model, storage, condition }
 *     Response: TradeInQuote { id, estimatedCredit, validUntil }
 *     Status:   201
 *
 *   POST /api/cart/trade-in
 *     Request:  { quoteId }
 *     Response: cart totals with tradeInCredit, onceOffSubtotal, vat, total
 *     Status:   200
 *
 *   Mock valuation adapter uses a brand + model + condition lookup table.
 *   tradeInCredit is subtracted from the cart total.
 *   Persists to trade_in_quotes table (id, brand, model, storage, condition,
 *   estimatedCredit, validUntil, cartId).
 */

// Redirect the store to a temp file so each test run is isolated and the
// shared backend/data/trade_in_quotes.json does not accumulate state.
const TEST_DB_PATH = path.join(os.tmpdir(), `trade_in_quotes_test_${process.pid}.json`);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tradeInStore = require('../../modules/trade-in/tradeInStore');
tradeInStore.setDbPath(TEST_DB_PATH);

afterAll(() => {
  try { fs.unlinkSync(TEST_DB_PATH); } catch { /* already gone */ }
});

interface TradeInQuote {
  id: string;
  estimatedCredit: number;
  validUntil: string;
}

interface CartTradeInResponse {
  tradeInCredit: number;
  onceOffSubtotal: number;
  vat: number;
  total: number;
}

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

async function postQuote(
  app: Application,
  body: Record<string, unknown>,
): Promise<{ status: number; body: TradeInQuote & Record<string, unknown> }> {
  const res = await request(app)
    .post('/api/trade-in/quote')
    .set('Content-Type', 'application/json')
    .send(body);
  return { status: res.status, body: res.body as TradeInQuote & Record<string, unknown> };
}

async function applyTradeIn(
  app: Application,
  body: Record<string, unknown>,
): Promise<{ status: number; body: CartTradeInResponse & Record<string, unknown> }> {
  const res = await request(app)
    .post('/api/cart/trade-in')
    .set('Content-Type', 'application/json')
    .send(body);
  return { status: res.status, body: res.body as CartTradeInResponse & Record<string, unknown> };
}

const VALID_QUOTE_BODY = {
  brand: 'Apple',
  model: 'iPhone 12',
  storage: 128,
  condition: 'GOOD',
};

// ---------------------------------------------------------------------------
// AC-1  POST /api/trade-in/quote — HTTP status and response shape
// ---------------------------------------------------------------------------

describe('POST /api/trade-in/quote — response shape', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 201 for a valid request', async () => {
    const { status } = await postQuote(app, VALID_QUOTE_BODY);
    expect(status).toBe(201);
  });

  it('response contains an id field', async () => {
    const { body } = await postQuote(app, VALID_QUOTE_BODY);
    expect(body).toHaveProperty('id');
  });

  it('id is a non-empty string', async () => {
    const { body } = await postQuote(app, VALID_QUOTE_BODY);
    expect(typeof body.id).toBe('string');
    expect((body.id as string).trim().length).toBeGreaterThan(0);
  });

  it('response contains an estimatedCredit field', async () => {
    const { body } = await postQuote(app, VALID_QUOTE_BODY);
    expect(body).toHaveProperty('estimatedCredit');
  });

  it('estimatedCredit is a positive number', async () => {
    const { body } = await postQuote(app, VALID_QUOTE_BODY);
    expect(typeof body.estimatedCredit).toBe('number');
    expect(body.estimatedCredit as number).toBeGreaterThan(0);
  });

  it('response contains a validUntil field', async () => {
    const { body } = await postQuote(app, VALID_QUOTE_BODY);
    expect(body).toHaveProperty('validUntil');
  });

  it('validUntil is a valid ISO-8601 date string', async () => {
    const { body } = await postQuote(app, VALID_QUOTE_BODY);
    expect(typeof body.validUntil).toBe('string');
    expect(new Date(body.validUntil as string).getTime()).not.toBeNaN();
  });

  it('validUntil is a future date', async () => {
    const { body } = await postQuote(app, VALID_QUOTE_BODY);
    const until = new Date(body.validUntil as string).getTime();
    expect(until).toBeGreaterThan(Date.now());
  });

  it('response contains exactly id, estimatedCredit, and validUntil at top level', async () => {
    const { body } = await postQuote(app, VALID_QUOTE_BODY);
    expect(Object.keys(body).sort()).toEqual(['estimatedCredit', 'id', 'validUntil'].sort());
  });
});

// ---------------------------------------------------------------------------
// AC-2  POST /api/trade-in/quote — validation: required fields
// ---------------------------------------------------------------------------

describe('POST /api/trade-in/quote — validation', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 400 when brand is missing', async () => {
    const { brand: _brand, ...body } = VALID_QUOTE_BODY;
    const { status } = await postQuote(app, body);
    expect(status).toBe(400);
  });

  it('returns HTTP 400 when model is missing', async () => {
    const { model: _model, ...body } = VALID_QUOTE_BODY;
    const { status } = await postQuote(app, body);
    expect(status).toBe(400);
  });

  it('returns HTTP 400 when storage is missing', async () => {
    const { storage: _storage, ...body } = VALID_QUOTE_BODY;
    const { status } = await postQuote(app, body);
    expect(status).toBe(400);
  });

  it('returns HTTP 400 when condition is missing', async () => {
    const { condition: _condition, ...body } = VALID_QUOTE_BODY;
    const { status } = await postQuote(app, body);
    expect(status).toBe(400);
  });

  it('returns HTTP 400 for an empty request body', async () => {
    const { status } = await postQuote(app, {});
    expect(status).toBe(400);
  });

  it('returns HTTP 400 for an invalid condition value', async () => {
    const { status } = await postQuote(app, { ...VALID_QUOTE_BODY, condition: 'PERFECT_MINT' });
    expect(status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// AC-3  POST /api/trade-in/quote — rule-based mock valuation adapter
// ---------------------------------------------------------------------------

describe('POST /api/trade-in/quote — mock valuation lookup table', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('EXCELLENT condition yields a higher credit than GOOD for the same device', async () => {
    const [excellent, good] = await Promise.all([
      postQuote(app, { ...VALID_QUOTE_BODY, condition: 'EXCELLENT' }),
      postQuote(app, { ...VALID_QUOTE_BODY, condition: 'GOOD' }),
    ]);
    expect(excellent.body.estimatedCredit as number).toBeGreaterThan(
      good.body.estimatedCredit as number,
    );
  });

  it('GOOD condition yields a higher credit than FAIR for the same device', async () => {
    const [good, fair] = await Promise.all([
      postQuote(app, { ...VALID_QUOTE_BODY, condition: 'GOOD' }),
      postQuote(app, { ...VALID_QUOTE_BODY, condition: 'FAIR' }),
    ]);
    expect(good.body.estimatedCredit as number).toBeGreaterThan(
      fair.body.estimatedCredit as number,
    );
  });

  it('FAIR condition yields a higher credit than POOR for the same device', async () => {
    const [fair, poor] = await Promise.all([
      postQuote(app, { ...VALID_QUOTE_BODY, condition: 'FAIR' }),
      postQuote(app, { ...VALID_QUOTE_BODY, condition: 'POOR' }),
    ]);
    expect(fair.body.estimatedCredit as number).toBeGreaterThan(
      poor.body.estimatedCredit as number,
    );
  });

  it('Samsung device returns a non-zero credit', async () => {
    const { body, status } = await postQuote(app, {
      brand: 'Samsung',
      model: 'Galaxy S21',
      storage: 128,
      condition: 'GOOD',
    });
    expect(status).toBe(201);
    expect(body.estimatedCredit as number).toBeGreaterThan(0);
  });

  it('Apple device returns a non-zero credit', async () => {
    const { body, status } = await postQuote(app, {
      brand: 'Apple',
      model: 'iPhone 13',
      storage: 256,
      condition: 'EXCELLENT',
    });
    expect(status).toBe(201);
    expect(body.estimatedCredit as number).toBeGreaterThan(0);
  });

  it('two calls for the same device and condition return the same estimatedCredit', async () => {
    const [first, second] = await Promise.all([
      postQuote(app, VALID_QUOTE_BODY),
      postQuote(app, VALID_QUOTE_BODY),
    ]);
    expect(first.body.estimatedCredit).toBe(second.body.estimatedCredit);
  });
});

// ---------------------------------------------------------------------------
// AC-4  POST /api/cart/trade-in — HTTP status and response shape
// ---------------------------------------------------------------------------

describe('POST /api/cart/trade-in — response shape', () => {
  let app: Application;
  let quoteId: string;

  beforeAll(async () => {
    app = getApp();
    const { body } = await postQuote(app, VALID_QUOTE_BODY);
    quoteId = body.id as string;
  });

  it('returns HTTP 200 for a valid quoteId', async () => {
    const { status } = await applyTradeIn(app, { quoteId });
    expect(status).toBe(200);
  });

  it('response contains a tradeInCredit field', async () => {
    const { body } = await applyTradeIn(app, { quoteId });
    expect(body).toHaveProperty('tradeInCredit');
  });

  it('tradeInCredit is a positive number', async () => {
    const { body } = await applyTradeIn(app, { quoteId });
    expect(typeof body.tradeInCredit).toBe('number');
    expect(body.tradeInCredit as number).toBeGreaterThan(0);
  });

  it('response contains an onceOffSubtotal field', async () => {
    const { body } = await applyTradeIn(app, { quoteId });
    expect(body).toHaveProperty('onceOffSubtotal');
  });

  it('onceOffSubtotal is a non-negative number', async () => {
    const { body } = await applyTradeIn(app, { quoteId });
    expect(typeof body.onceOffSubtotal).toBe('number');
    expect(body.onceOffSubtotal as number).toBeGreaterThanOrEqual(0);
  });

  it('response contains a vat field', async () => {
    const { body } = await applyTradeIn(app, { quoteId });
    expect(body).toHaveProperty('vat');
  });

  it('vat is a non-negative number', async () => {
    const { body } = await applyTradeIn(app, { quoteId });
    expect(typeof body.vat).toBe('number');
    expect(body.vat as number).toBeGreaterThanOrEqual(0);
  });

  it('response contains a total field', async () => {
    const { body } = await applyTradeIn(app, { quoteId });
    expect(body).toHaveProperty('total');
  });

  it('total is a non-negative number', async () => {
    const { body } = await applyTradeIn(app, { quoteId });
    expect(typeof body.total).toBe('number');
    expect(body.total as number).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// AC-5  POST /api/cart/trade-in — credit subtraction arithmetic
// ---------------------------------------------------------------------------

describe('POST /api/cart/trade-in — credit subtraction', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('tradeInCredit in the cart response matches estimatedCredit from the quote', async () => {
    const { body: quoteBody } = await postQuote(app, VALID_QUOTE_BODY);
    const { body: cartBody } = await applyTradeIn(app, { quoteId: quoteBody.id });
    expect(cartBody.tradeInCredit).toBe(quoteBody.estimatedCredit);
  });

  it('total equals onceOffSubtotal + vat minus tradeInCredit', async () => {
    const { body: quoteBody } = await postQuote(app, VALID_QUOTE_BODY);
    const { body } = await applyTradeIn(app, { quoteId: quoteBody.id });
    const expected =
      (body.onceOffSubtotal as number) +
      (body.vat as number) -
      (body.tradeInCredit as number);
    expect(body.total as number).toBeCloseTo(expected, 2);
  });
});

// ---------------------------------------------------------------------------
// AC-6  POST /api/cart/trade-in — validation and error cases
// ---------------------------------------------------------------------------

describe('POST /api/cart/trade-in — validation', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 400 when quoteId is missing from the request body', async () => {
    const { status } = await applyTradeIn(app, {});
    expect(status).toBe(400);
  });

  it('returns HTTP 404 when the quoteId does not correspond to any known quote', async () => {
    const { status } = await applyTradeIn(app, { quoteId: 'nonexistent-quote-id-99999' });
    expect(status).toBe(404);
  });
});
