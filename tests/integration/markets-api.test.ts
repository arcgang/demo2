/**
 * Integration tests for GET /api/markets and GET /api/markets/:code.
 * These tests hit the real database — no DB-layer mocks.
 *
 * Acceptance criteria exercised:
 *   - GET /api/markets returns the seeded market list.
 *   - GET /api/markets/ZA returns correct currency, tax rate, language, payment methods.
 *   - GET /api/markets/:code returns 404 for an unknown or inactive market.
 *   - Adding a new row makes the market available without code change.
 */

import supertest from 'supertest';
import { createApp } from '../../src/app';
import { db } from '../../src/db/client';
import { runMigrations } from '../../src/db/migrate';

const app = createApp();
const request = supertest(app);

beforeAll(async () => {
  await runMigrations();
});

afterAll(async () => {
  await db.end();
});

// ---------------------------------------------------------------------------
// GET /api/markets
// ---------------------------------------------------------------------------

describe('GET /api/markets', () => {
  it('responds 200 with an array', async () => {
    const res = await request.get('/api/markets');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('includes the seeded ZA market', async () => {
    const res = await request.get('/api/markets');
    expect(res.status).toBe(200);
    const za = (res.body as Record<string, unknown>[]).find(
      (m) => m['code'] === 'ZA',
    );
    expect(za).toBeDefined();
  });

  it('returns only active markets', async () => {
    // Seed an inactive market and confirm it does not appear in the list.
    await db.query(`
      INSERT INTO markets (code, name, currency_code, currency_symbol, tax_label, tax_rate,
                           language_code, enabled_payment_methods, active)
      VALUES ('XX', 'Inactive Market', 'XXX', 'X', 'TAX', 0.10, 'en', '["card"]'::jsonb, false)
      ON CONFLICT (code) DO NOTHING
    `);

    const res = await request.get('/api/markets');
    expect(res.status).toBe(200);
    const codes = (res.body as Record<string, unknown>[]).map((m) => m['code']);
    expect(codes).not.toContain('XX');

    await db.query(`DELETE FROM markets WHERE code = 'XX'`);
  });

  it('each item has required fields: code, name, currencyCode, currencySymbol, taxLabel, taxRate, languageCode, enabledPaymentMethods', async () => {
    const res = await request.get('/api/markets');
    expect(res.status).toBe(200);
    expect((res.body as unknown[]).length).toBeGreaterThan(0);

    for (const market of res.body as Record<string, unknown>[]) {
      expect(market).toHaveProperty('code');
      expect(market).toHaveProperty('name');
      expect(market).toHaveProperty('currencyCode');
      expect(market).toHaveProperty('currencySymbol');
      expect(market).toHaveProperty('taxLabel');
      expect(market).toHaveProperty('taxRate');
      expect(market).toHaveProperty('languageCode');
      expect(market).toHaveProperty('enabledPaymentMethods');
    }
  });

  it('returns a new market after inserting a row — no code change required', async () => {
    await db.query(`
      INSERT INTO markets (code, name, currency_code, currency_symbol, tax_label, tax_rate,
                           language_code, enabled_payment_methods, active)
      VALUES ('TZ', 'Tanzania', 'TZS', 'TSh', 'VAT', 0.18, 'sw', '["mobile_money"]'::jsonb, true)
      ON CONFLICT (code) DO NOTHING
    `);

    const res = await request.get('/api/markets');
    expect(res.status).toBe(200);
    const codes = (res.body as Record<string, unknown>[]).map((m) => m['code']);
    expect(codes).toContain('TZ');

    // cleanup
    await db.query(`DELETE FROM markets WHERE code = 'TZ'`);
  });
});

// ---------------------------------------------------------------------------
// GET /api/markets/:code
// ---------------------------------------------------------------------------

describe('GET /api/markets/:code', () => {
  it('returns 200 with the ZA market object', async () => {
    const res = await request.get('/api/markets/ZA');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 'ZA',
    });
  });

  it('ZA record has correct currency code ZAR', async () => {
    const res = await request.get('/api/markets/ZA');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('currencyCode', 'ZAR');
  });

  it('ZA record has correct currency symbol R', async () => {
    const res = await request.get('/api/markets/ZA');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('currencySymbol', 'R');
  });

  it('ZA record has tax label VAT', async () => {
    const res = await request.get('/api/markets/ZA');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('taxLabel', 'VAT');
  });

  it('ZA record has tax rate 0.15 (15%)', async () => {
    const res = await request.get('/api/markets/ZA');
    expect(res.status).toBe(200);
    expect(parseFloat(res.body['taxRate'])).toBeCloseTo(0.15, 4);
  });

  it('ZA record has language code en-ZA', async () => {
    const res = await request.get('/api/markets/ZA');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('languageCode', 'en-ZA');
  });

  it('ZA record includes card in enabledPaymentMethods', async () => {
    const res = await request.get('/api/markets/ZA');
    expect(res.status).toBe(200);
    expect(res.body['enabledPaymentMethods']).toContain('card');
  });

  it('ZA record includes mobile_money in enabledPaymentMethods', async () => {
    const res = await request.get('/api/markets/ZA');
    expect(res.status).toBe(200);
    expect(res.body['enabledPaymentMethods']).toContain('mobile_money');
  });

  it('returns 404 for an unknown market code', async () => {
    const res = await request.get('/api/markets/UNKNOWN');
    expect(res.status).toBe(404);
  });

  it('returns 404 for an inactive market', async () => {
    await db.query(`
      INSERT INTO markets (code, name, currency_code, currency_symbol, tax_label, tax_rate,
                           language_code, enabled_payment_methods, active)
      VALUES ('YY', 'Inactive', 'YYY', 'Y', 'TAX', 0.05, 'en', '["card"]'::jsonb, false)
      ON CONFLICT (code) DO NOTHING
    `);

    const res = await request.get('/api/markets/YY');
    expect(res.status).toBe(404);

    await db.query(`DELETE FROM markets WHERE code = 'YY'`);
  });

  it('response object does not include an "active" field (internal field excluded from API)', async () => {
    const res = await request.get('/api/markets/ZA');
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('active');
  });
});
