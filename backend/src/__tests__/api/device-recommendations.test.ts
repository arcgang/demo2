import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for GET /api/devices/:id/recommendations
 *
 * Contract (task spec + LLD §5.3):
 *   - Returns compatible plans (required:true), accessories and add-ons (required:false)
 *     for the given device, each carrying a pricingRule{onceOff,monthly} so the
 *     frontend can recalculate totals without a round-trip.
 *   - iPhone 15 Pro seed must include exactly 3 plans, 4 accessories, and 3 add-ons.
 *   - Response includes a pricingSummary helper (onceOffSubtotal, vatRate, vatAmount,
 *     monthlyTotal) computed from all required items.
 *   - Unknown deviceId returns 404 with errorCode.
 */

// ─── response shapes ─────────────────────────────────────────────────────────

interface PricingRule {
  onceOff: number;
  monthly: number;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  required: boolean;
  pricingRule: PricingRule;
}

interface PricingSummary {
  onceOffSubtotal: number;
  vatRate: number;
  vatAmount: number;
  monthlyTotal: number;
}

interface RecommendationsResponse {
  deviceId: string;
  attachments: Attachment[];
  pricingSummary: PricingSummary;
}

interface ErrorResponse {
  errorCode: string;
  message?: string;
}

// ─── constants ────────────────────────────────────────────────────────────────

const IPHONE15PRO_ID = 'prod_za_iphone15pro_256';
const UNKNOWN_DEVICE_ID = 'prod_does_not_exist_xyz';

// Expected seed values from task spec
const EXPECTED_PLANS = [
  { name: 'Vodacom Red 5GB', monthly: 299 },
  { name: 'Unlimited 20GB', monthly: 799 },
  { name: 'Red Premium', monthly: 1299 },
];
const EXPECTED_ACCESSORIES = [
  { name: 'AirPods Pro', onceOff: 4999 },
  { name: 'Silicone Case', onceOff: 799 },
  { name: '20W Adapter', onceOff: 399 },
  { name: 'Screen Protector', onceOff: 299 },
];
const EXPECTED_ADDONS = [
  { name: 'Extra 10GB', monthly: 199 },
  { name: 'International Calling', monthly: 149 },
  { name: 'Roaming', monthly: 299 },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app') as { createApp: () => Application };
  return createApp();
}

async function getRecommendations(
  app: Application,
  deviceId: string,
): Promise<{ status: number; body: unknown }> {
  const res = await request(app).get(`/api/devices/${deviceId}/recommendations`);
  return { status: res.status, body: res.body };
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  200 response shape for a known device
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/devices/:id/recommendations — AC-1 200 shape', () => {
  let app: Application;
  let result: { status: number; body: unknown };

  beforeAll(async () => {
    app = getApp();
    result = await getRecommendations(app, IPHONE15PRO_ID);
  });

  it('returns HTTP 200 for the iPhone 15 Pro device', () => {
    expect(result.status).toBe(200);
  });

  it('response body is a non-null object', () => {
    expect(typeof result.body).toBe('object');
    expect(result.body).not.toBeNull();
  });

  it('response includes deviceId matching the requested id', () => {
    const body = result.body as RecommendationsResponse;
    expect(body.deviceId).toBe(IPHONE15PRO_ID);
  });

  it('response includes an attachments array', () => {
    const body = result.body as RecommendationsResponse;
    expect(Array.isArray(body.attachments)).toBe(true);
  });

  it('response includes a pricingSummary object', () => {
    const body = result.body as RecommendationsResponse;
    expect(typeof body.pricingSummary).toBe('object');
    expect(body.pricingSummary).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  Each attachment has required fields and correct shapes
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/devices/:id/recommendations — AC-2 attachment field shapes', () => {
  let app: Application;
  let attachments: Attachment[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getRecommendations(app, IPHONE15PRO_ID);
    attachments = (body as RecommendationsResponse).attachments;
  });

  it('each attachment has a non-empty id string', () => {
    for (const a of attachments) {
      expect(typeof a.id).toBe('string');
      expect(a.id.trim().length).toBeGreaterThan(0);
    }
  });

  it('each attachment has a non-empty name string', () => {
    for (const a of attachments) {
      expect(typeof a.name).toBe('string');
      expect(a.name.trim().length).toBeGreaterThan(0);
    }
  });

  it('each attachment has a non-empty type string', () => {
    for (const a of attachments) {
      expect(typeof a.type).toBe('string');
      expect(a.type.trim().length).toBeGreaterThan(0);
    }
  });

  it('each attachment has a required boolean field', () => {
    for (const a of attachments) {
      expect(typeof a.required).toBe('boolean');
    }
  });

  it('each attachment has a pricingRule object', () => {
    for (const a of attachments) {
      expect(typeof a.pricingRule).toBe('object');
      expect(a.pricingRule).not.toBeNull();
    }
  });

  it('each pricingRule has a numeric onceOff field', () => {
    for (const a of attachments) {
      expect(typeof a.pricingRule.onceOff).toBe('number');
      expect(a.pricingRule.onceOff).toBeGreaterThanOrEqual(0);
    }
  });

  it('each pricingRule has a numeric monthly field', () => {
    for (const a of attachments) {
      expect(typeof a.pricingRule.monthly).toBe('number');
      expect(a.pricingRule.monthly).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  Plans are marked required:true
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/devices/:id/recommendations — AC-3 plans required flag', () => {
  let app: Application;
  let attachments: Attachment[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getRecommendations(app, IPHONE15PRO_ID);
    attachments = (body as RecommendationsResponse).attachments;
  });

  it('at least one attachment is a PLAN type', () => {
    const plans = attachments.filter(a => a.type === 'PLAN');
    expect(plans.length).toBeGreaterThan(0);
  });

  it('all PLAN attachments have required:true', () => {
    const plans = attachments.filter(a => a.type === 'PLAN');
    for (const plan of plans) {
      expect(plan.required).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  Accessories and add-ons are marked required:false
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/devices/:id/recommendations — AC-4 accessories/add-ons optional flag', () => {
  let app: Application;
  let attachments: Attachment[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getRecommendations(app, IPHONE15PRO_ID);
    attachments = (body as RecommendationsResponse).attachments;
  });

  it('at least one attachment is an ACCESSORY type', () => {
    const accessories = attachments.filter(a => a.type === 'ACCESSORY');
    expect(accessories.length).toBeGreaterThan(0);
  });

  it('all ACCESSORY attachments have required:false', () => {
    const accessories = attachments.filter(a => a.type === 'ACCESSORY');
    for (const acc of accessories) {
      expect(acc.required).toBe(false);
    }
  });

  it('all ADDON attachments have required:false', () => {
    const addons = attachments.filter(a => a.type === 'ADDON');
    for (const addon of addons) {
      expect(addon.required).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  iPhone 15 Pro seed: exactly 3 plans, 4 accessories, 3 add-ons
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/devices/:id/recommendations — AC-5 iPhone 15 Pro seed counts', () => {
  let app: Application;
  let attachments: Attachment[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getRecommendations(app, IPHONE15PRO_ID);
    attachments = (body as RecommendationsResponse).attachments;
  });

  it('exactly 3 PLAN attachments are returned', () => {
    const plans = attachments.filter(a => a.type === 'PLAN');
    expect(plans.length).toBe(3);
  });

  it('exactly 4 ACCESSORY attachments are returned', () => {
    const accessories = attachments.filter(a => a.type === 'ACCESSORY');
    expect(accessories.length).toBe(4);
  });

  it('exactly 3 ADDON attachments are returned', () => {
    const addons = attachments.filter(a => a.type === 'ADDON');
    expect(addons.length).toBe(3);
  });

  it('total attachments count is 10', () => {
    expect(attachments.length).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  iPhone 15 Pro plans match spec prices
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/devices/:id/recommendations — AC-6 iPhone 15 Pro plan prices', () => {
  let app: Application;
  let plans: Attachment[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getRecommendations(app, IPHONE15PRO_ID);
    plans = (body as RecommendationsResponse).attachments.filter(a => a.type === 'PLAN');
  });

  it('a plan with monthly R299 is present (Vodacom Red 5GB)', () => {
    const found = plans.find(p => p.pricingRule.monthly === 299);
    expect(found).toBeDefined();
  });

  it('a plan with monthly R799 is present (Unlimited 20GB)', () => {
    const found = plans.find(p => p.pricingRule.monthly === 799);
    expect(found).toBeDefined();
  });

  it('a plan with monthly R1299 is present (Red Premium)', () => {
    const found = plans.find(p => p.pricingRule.monthly === 1299);
    expect(found).toBeDefined();
  });

  it('all plans have onceOff of 0 (monthly-only plans)', () => {
    for (const plan of plans) {
      expect(plan.pricingRule.onceOff).toBe(0);
    }
  });

  it('plan names contain expected identifiers', () => {
    const names = plans.map(p => p.name);
    for (const expected of EXPECTED_PLANS) {
      const match = names.find(n => n.toLowerCase().includes(expected.name.toLowerCase().split(' ')[1]));
      expect(match).toBeDefined();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-7  iPhone 15 Pro accessories match spec prices
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/devices/:id/recommendations — AC-7 iPhone 15 Pro accessory prices', () => {
  let app: Application;
  let accessories: Attachment[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getRecommendations(app, IPHONE15PRO_ID);
    accessories = (body as RecommendationsResponse).attachments.filter(a => a.type === 'ACCESSORY');
  });

  it('an accessory with onceOff R4999 is present (AirPods Pro)', () => {
    const found = accessories.find(a => a.pricingRule.onceOff === 4999);
    expect(found).toBeDefined();
  });

  it('an accessory with onceOff R799 is present (Silicone Case)', () => {
    const found = accessories.find(a => a.pricingRule.onceOff === 799);
    expect(found).toBeDefined();
  });

  it('an accessory with onceOff R399 is present (20W Adapter)', () => {
    const found = accessories.find(a => a.pricingRule.onceOff === 399);
    expect(found).toBeDefined();
  });

  it('an accessory with onceOff R299 is present (Screen Protector)', () => {
    const found = accessories.find(a => a.pricingRule.onceOff === 299);
    expect(found).toBeDefined();
  });

  it('all accessories have monthly of 0 (once-off only)', () => {
    for (const acc of accessories) {
      expect(acc.pricingRule.monthly).toBe(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-8  iPhone 15 Pro add-ons match spec prices
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/devices/:id/recommendations — AC-8 iPhone 15 Pro add-on prices', () => {
  let app: Application;
  let addons: Attachment[];

  beforeAll(async () => {
    app = getApp();
    const { body } = await getRecommendations(app, IPHONE15PRO_ID);
    addons = (body as RecommendationsResponse).attachments.filter(a => a.type === 'ADDON');
  });

  it('an add-on with monthly R199 is present (Extra 10GB)', () => {
    const found = addons.find(a => a.pricingRule.monthly === 199);
    expect(found).toBeDefined();
  });

  it('an add-on with monthly R149 is present (International Calling)', () => {
    const found = addons.find(a => a.pricingRule.monthly === 149);
    expect(found).toBeDefined();
  });

  it('an add-on with monthly R299 is present (Roaming)', () => {
    const found = addons.find(a => a.pricingRule.monthly === 299);
    expect(found).toBeDefined();
  });

  it('all add-ons have onceOff of 0', () => {
    for (const addon of addons) {
      expect(addon.pricingRule.onceOff).toBe(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-9  pricingSummary fields and VAT calculation
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/devices/:id/recommendations — AC-9 pricingSummary shape', () => {
  let app: Application;
  let body: RecommendationsResponse;

  beforeAll(async () => {
    app = getApp();
    const result = await getRecommendations(app, IPHONE15PRO_ID);
    body = result.body as RecommendationsResponse;
  });

  it('pricingSummary has a numeric onceOffSubtotal', () => {
    expect(typeof body.pricingSummary.onceOffSubtotal).toBe('number');
    expect(body.pricingSummary.onceOffSubtotal).toBeGreaterThanOrEqual(0);
  });

  it('pricingSummary has vatRate of 0.15', () => {
    expect(body.pricingSummary.vatRate).toBe(0.15);
  });

  it('pricingSummary has a numeric vatAmount', () => {
    expect(typeof body.pricingSummary.vatAmount).toBe('number');
    expect(body.pricingSummary.vatAmount).toBeGreaterThanOrEqual(0);
  });

  it('pricingSummary has a numeric monthlyTotal', () => {
    expect(typeof body.pricingSummary.monthlyTotal).toBe('number');
    expect(body.pricingSummary.monthlyTotal).toBeGreaterThanOrEqual(0);
  });

  it('vatAmount equals onceOffSubtotal * 0.15 (rounded to 2dp)', () => {
    const expected = parseFloat((body.pricingSummary.onceOffSubtotal * 0.15).toFixed(2));
    expect(body.pricingSummary.vatAmount).toBeCloseTo(expected, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-10  404 for unknown device
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/devices/:id/recommendations — AC-10 404 for unknown device', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('returns HTTP 404 for an unknown deviceId', async () => {
    const { status } = await getRecommendations(app, UNKNOWN_DEVICE_ID);
    expect(status).toBe(404);
  });

  it('404 response includes an errorCode', async () => {
    const { body } = await getRecommendations(app, UNKNOWN_DEVICE_ID);
    const err = body as ErrorResponse;
    expect(typeof err.errorCode).toBe('string');
    expect(err.errorCode.trim().length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-11  Attachment IDs are unique within the response
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/devices/:id/recommendations — AC-11 unique attachment IDs', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('all attachment IDs in the response are unique strings', async () => {
    const { body } = await getRecommendations(app, IPHONE15PRO_ID);
    const attachments = (body as RecommendationsResponse).attachments;
    const ids = attachments.map(a => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-12  Endpoint does not 500 for the seeded device
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/devices/:id/recommendations — AC-12 no 500 for known device', () => {
  let app: Application;

  beforeAll(() => { app = getApp(); });

  it('endpoint does not return 500 for the iPhone 15 Pro device', async () => {
    const { status } = await getRecommendations(app, IPHONE15PRO_ID);
    expect(status).not.toBe(500);
  });
});
