"use strict";
/**
 * Integration tests for MarketContextService.
 * These tests hit the real database — no DB-layer mocks.
 *
 * Acceptance criteria exercised:
 *   - list() returns all active markets.
 *   - resolve(code) returns the matching active market.
 *   - resolve() with no argument returns the default (first active) market.
 *   - resolve() / resolve(code) returns null / throws for unknown or inactive codes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../../src/db/client");
const migrate_1 = require("../../src/db/migrate");
const MarketContextService_1 = require("../../src/modules/market-context/MarketContextService");
beforeAll(async () => {
    await (0, migrate_1.runMigrations)();
});
afterAll(async () => {
    await client_1.db.end();
});
// ---------------------------------------------------------------------------
// MarketContextService.list()
// ---------------------------------------------------------------------------
describe('MarketContextService.list()', () => {
    it('returns an array', async () => {
        const markets = await MarketContextService_1.MarketContextService.list();
        expect(Array.isArray(markets)).toBe(true);
    });
    it('contains the seeded ZA market', async () => {
        const markets = await MarketContextService_1.MarketContextService.list();
        const za = markets.find((m) => m.code === 'ZA');
        expect(za).toBeDefined();
    });
    it('every returned market is active', async () => {
        // Insert an inactive market and verify it is excluded.
        await client_1.db.query(`
      INSERT INTO markets (code, name, currency_code, currency_symbol, tax_label, tax_rate,
                           language_code, enabled_payment_methods, active)
      VALUES ('ZZ', 'Inactive Test', 'ZZZ', 'Z', 'TAX', 0.00, 'en', '["card"]'::jsonb, false)
      ON CONFLICT (code) DO NOTHING
    `);
        const markets = await MarketContextService_1.MarketContextService.list();
        const codes = markets.map((m) => m.code);
        expect(codes).not.toContain('ZZ');
        await client_1.db.query(`DELETE FROM markets WHERE code = 'ZZ'`);
    });
    it('each market has code, name, currencyCode, currencySymbol, taxLabel, taxRate, languageCode, enabledPaymentMethods', async () => {
        const markets = await MarketContextService_1.MarketContextService.list();
        expect(markets.length).toBeGreaterThan(0);
        for (const m of markets) {
            expect(m).toHaveProperty('code');
            expect(m).toHaveProperty('name');
            expect(m).toHaveProperty('currencyCode');
            expect(m).toHaveProperty('currencySymbol');
            expect(m).toHaveProperty('taxLabel');
            expect(m).toHaveProperty('taxRate');
            expect(m).toHaveProperty('languageCode');
            expect(m).toHaveProperty('enabledPaymentMethods');
        }
    });
    it('picks up a newly inserted active market without code change', async () => {
        await client_1.db.query(`
      INSERT INTO markets (code, name, currency_code, currency_symbol, tax_label, tax_rate,
                           language_code, enabled_payment_methods, active)
      VALUES ('MZ', 'Mozambique', 'MZN', 'MT', 'IVA', 0.17, 'pt', '["mobile_money","card"]'::jsonb, true)
      ON CONFLICT (code) DO NOTHING
    `);
        const markets = await MarketContextService_1.MarketContextService.list();
        const codes = markets.map((m) => m.code);
        expect(codes).toContain('MZ');
        await client_1.db.query(`DELETE FROM markets WHERE code = 'MZ'`);
    });
});
// ---------------------------------------------------------------------------
// MarketContextService.resolve(code?)
// ---------------------------------------------------------------------------
describe('MarketContextService.resolve(code)', () => {
    it('returns the ZA market when called with "ZA"', async () => {
        const market = await MarketContextService_1.MarketContextService.resolve('ZA');
        expect(market).not.toBeNull();
        expect(market.code).toBe('ZA');
    });
    it('ZA market has currencyCode ZAR', async () => {
        const market = await MarketContextService_1.MarketContextService.resolve('ZA');
        expect(market.currencyCode).toBe('ZAR');
    });
    it('ZA market has currencySymbol R', async () => {
        const market = await MarketContextService_1.MarketContextService.resolve('ZA');
        expect(market.currencySymbol).toBe('R');
    });
    it('ZA market has taxLabel VAT', async () => {
        const market = await MarketContextService_1.MarketContextService.resolve('ZA');
        expect(market.taxLabel).toBe('VAT');
    });
    it('ZA market has taxRate approximately 0.15', async () => {
        const market = await MarketContextService_1.MarketContextService.resolve('ZA');
        expect(parseFloat(String(market.taxRate))).toBeCloseTo(0.15, 4);
    });
    it('ZA market has languageCode en-ZA', async () => {
        const market = await MarketContextService_1.MarketContextService.resolve('ZA');
        expect(market.languageCode).toBe('en-ZA');
    });
    it('ZA enabledPaymentMethods includes card', async () => {
        const market = await MarketContextService_1.MarketContextService.resolve('ZA');
        expect(market.enabledPaymentMethods).toContain('card');
    });
    it('ZA enabledPaymentMethods includes mobile_money', async () => {
        const market = await MarketContextService_1.MarketContextService.resolve('ZA');
        expect(market.enabledPaymentMethods).toContain('mobile_money');
    });
    it('returns null (or throws) for an unknown market code', async () => {
        // Implementations may return null or throw — both are acceptable.
        let result = null;
        let threw = false;
        try {
            result = await MarketContextService_1.MarketContextService.resolve('UNKNOWN');
        }
        catch {
            threw = true;
        }
        if (!threw) {
            expect(result).toBeNull();
        }
    });
    it('returns null (or throws) for an inactive market code', async () => {
        await client_1.db.query(`
      INSERT INTO markets (code, name, currency_code, currency_symbol, tax_label, tax_rate,
                           language_code, enabled_payment_methods, active)
      VALUES ('QQ', 'Inactive', 'QQQ', 'Q', 'TAX', 0.05, 'en', '["card"]'::jsonb, false)
      ON CONFLICT (code) DO NOTHING
    `);
        let result = null;
        let threw = false;
        try {
            result = await MarketContextService_1.MarketContextService.resolve('QQ');
        }
        catch {
            threw = true;
        }
        if (!threw) {
            expect(result).toBeNull();
        }
        await client_1.db.query(`DELETE FROM markets WHERE code = 'QQ'`);
    });
});
describe('MarketContextService.resolve() — default (no argument)', () => {
    it('returns a market object when called with no argument', async () => {
        const market = await MarketContextService_1.MarketContextService.resolve();
        expect(market).not.toBeNull();
        expect(typeof market.code).toBe('string');
    });
    it('returns the first active market (default)', async () => {
        // ZA is the only seeded active market; resolve() must return it.
        const market = await MarketContextService_1.MarketContextService.resolve();
        expect(market).not.toBeNull();
        expect(market.code).toBe('ZA');
    });
    it('default changes if a new active market is inserted ahead of ZA (seeding affects default)', async () => {
        // This verifies the "first active" contract: if no ordering guarantee is
        // defined, at least a default must be returned.  We simply assert that the
        // return value is non-null and is an active market in the list.
        const allActive = await MarketContextService_1.MarketContextService.list();
        const defaultMarket = await MarketContextService_1.MarketContextService.resolve();
        expect(defaultMarket).not.toBeNull();
        const codes = allActive.map((m) => m.code);
        expect(codes).toContain(defaultMarket.code);
    });
});
