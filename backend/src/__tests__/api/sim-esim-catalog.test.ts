import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for GET /api/catalog/sim-esim
 *
 * Contract (from LLD task spec):
 *   Returns SIM and eSIM offer listings with associated plan options and pricing,
 *   sourced from the Catalog and Offer Service mock adapter aligned to TMF620.
 *   Each offer carries a type discriminator: 'sim' | 'esim'.
 *
 *   Response shape:
 *     {
 *       offers: Array<{
 *         id: string,
 *         name: string,
 *         type: 'sim' | 'esim',
 *         planOptions: Array<{
 *           planId: string,
 *           name: string,
 *           recurringAmount: number,
 *           currency: string
 *         }>,
 *         pricing: {
 *           onceOff: number,
 *           currency: string
 *         }
 *       }>
 *     }
 */

interface PlanOption {
  planId: string;
  name: string;
  recurringAmount: number;
  currency: string;
}

interface OfferPricing {
  onceOff: number;
  currency: string;
}

interface SimEsimOffer {
  id: string;
  name: string;
  type: 'sim' | 'esim';
  planOptions: PlanOption[];
  pricing: OfferPricing;
}

interface SimEsimCatalogResponse {
  offers: SimEsimOffer[];
}

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

async function fetchCatalog(
  app: Application,
): Promise<{ status: number; body: SimEsimCatalogResponse }> {
  const res = await request(app).get('/api/catalog/sim-esim');
  return { status: res.status, body: res.body as SimEsimCatalogResponse };
}

// ---------------------------------------------------------------------------
// AC-1  Top-level response shape
// ---------------------------------------------------------------------------

describe('GET /api/catalog/sim-esim — top-level response shape', () => {
  let app: Application;
  beforeAll(() => { app = getApp(); });

  it('returns HTTP 200', async () => {
    const { status } = await fetchCatalog(app);
    expect(status).toBe(200);
  });

  it('response body has an offers array', async () => {
    const { body } = await fetchCatalog(app);
    expect(Array.isArray(body.offers)).toBe(true);
  });

  it('offers array is non-empty', async () => {
    const { body } = await fetchCatalog(app);
    expect(body.offers.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-2  Type discriminator — 'sim' | 'esim'
// ---------------------------------------------------------------------------

describe('GET /api/catalog/sim-esim — type discriminator', () => {
  let app: Application;
  let offers: SimEsimOffer[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await fetchCatalog(app);
    offers = body.offers;
  });

  it('every offer has a type field', () => {
    for (const offer of offers) {
      expect(offer).toHaveProperty('type');
    }
  });

  it('every offer type is either "sim" or "esim"', () => {
    for (const offer of offers) {
      expect(['sim', 'esim']).toContain(offer.type);
    }
  });

  it('response includes at least one SIM offer (type="sim")', () => {
    const simOffers = offers.filter((o) => o.type === 'sim');
    expect(simOffers.length).toBeGreaterThan(0);
  });

  it('response includes at least one eSIM offer (type="esim")', () => {
    const esimOffers = offers.filter((o) => o.type === 'esim');
    expect(esimOffers.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-3  Per-offer required fields
// ---------------------------------------------------------------------------

describe('GET /api/catalog/sim-esim — per-offer required fields', () => {
  let app: Application;
  let offers: SimEsimOffer[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await fetchCatalog(app);
    offers = body.offers;
  });

  it('every offer has id, name, type, planOptions, pricing', () => {
    for (const offer of offers) {
      expect(offer).toHaveProperty('id');
      expect(offer).toHaveProperty('name');
      expect(offer).toHaveProperty('type');
      expect(offer).toHaveProperty('planOptions');
      expect(offer).toHaveProperty('pricing');
    }
  });

  it('every offer id is a non-empty string', () => {
    for (const offer of offers) {
      expect(typeof offer.id).toBe('string');
      expect(offer.id.length).toBeGreaterThan(0);
    }
  });

  it('every offer name is a non-empty string', () => {
    for (const offer of offers) {
      expect(typeof offer.name).toBe('string');
      expect(offer.name.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-4  Pricing shape
// ---------------------------------------------------------------------------

describe('GET /api/catalog/sim-esim — pricing shape', () => {
  let app: Application;
  let offers: SimEsimOffer[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await fetchCatalog(app);
    offers = body.offers;
  });

  it('every offer pricing has onceOff as a number', () => {
    for (const offer of offers) {
      expect(offer).toHaveProperty('pricing.onceOff');
      expect(typeof offer.pricing.onceOff).toBe('number');
    }
  });

  it('every offer pricing has currency as a non-empty string', () => {
    for (const offer of offers) {
      expect(offer).toHaveProperty('pricing.currency');
      expect(typeof offer.pricing.currency).toBe('string');
      expect(offer.pricing.currency.length).toBeGreaterThan(0);
    }
  });

  it('every offer pricing onceOff is non-negative', () => {
    for (const offer of offers) {
      expect(offer.pricing.onceOff).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-5  Plan options shape
// ---------------------------------------------------------------------------

describe('GET /api/catalog/sim-esim — plan options shape', () => {
  let app: Application;
  let offers: SimEsimOffer[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await fetchCatalog(app);
    offers = body.offers;
  });

  it('every offer planOptions is an array', () => {
    for (const offer of offers) {
      expect(Array.isArray(offer.planOptions)).toBe(true);
    }
  });

  it('every offer has at least one plan option', () => {
    for (const offer of offers) {
      expect(offer.planOptions.length).toBeGreaterThan(0);
    }
  });

  it('every plan option has planId, name, recurringAmount, currency', () => {
    for (const offer of offers) {
      for (const plan of offer.planOptions) {
        expect(plan).toHaveProperty('planId');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('recurringAmount');
        expect(plan).toHaveProperty('currency');
      }
    }
  });

  it('every plan option planId is a non-empty string', () => {
    for (const offer of offers) {
      for (const plan of offer.planOptions) {
        expect(typeof plan.planId).toBe('string');
        expect(plan.planId.length).toBeGreaterThan(0);
      }
    }
  });

  it('every plan option recurringAmount is a non-negative number', () => {
    for (const offer of offers) {
      for (const plan of offer.planOptions) {
        expect(typeof plan.recurringAmount).toBe('number');
        expect(plan.recurringAmount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('every plan option currency is a non-empty string', () => {
    for (const offer of offers) {
      for (const plan of offer.planOptions) {
        expect(typeof plan.currency).toBe('string');
        expect(plan.currency.length).toBeGreaterThan(0);
      }
    }
  });
});
