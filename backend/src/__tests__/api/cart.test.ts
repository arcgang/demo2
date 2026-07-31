import request from 'supertest';
import { Application } from 'express';

/**
 * Acceptance tests for the Cart API
 *
 * Endpoints under test:
 *   GET    /api/cart              — retrieve cart with items and totals
 *   POST   /api/cart/items        — add an item to the cart
 *   PUT    /api/cart/items/:id    — update qty or variant_label of an item
 *   DELETE /api/cart/items/:id    — remove an item (409 if non-optional with no override)
 *
 * Data model fields (cart_item):
 *   id, cart_id, item_type (device|plan|bundle|accessory|sim|credit),
 *   product_id, product_name, variant_label, qty,
 *   once_off_price_cents, recurring_price_cents,
 *   tax_inclusive (bool), is_optional (bool), parent_item_id (nullable)
 *
 * Totals calculation (ZAR, 15% VAT):
 *   once_off_subtotal = sum(once_off_price_cents * qty)
 *   recurring_subtotal = sum(recurring_price_cents * qty)
 *   tax_amount = round(once_off_subtotal * 0.15)  [integer cents, ZAR convention]
 *   credits = sum of once_off_price_cents * qty for items where item_type='credit'
 *   total_once_off = once_off_subtotal + tax_amount + credits
 *   total_monthly = recurring_subtotal
 *
 * Acceptance criteria:
 *   AC-1  GET /api/cart returns all item_type variants and totals
 *   AC-2  POST /api/cart/items — add device+plan combo
 *   AC-3  Totals recalculated on every mutation
 *   AC-4  Tax at 15% ZAR, integer-cent rounding
 *   AC-5  Trade-in credit reduces total_once_off
 *   AC-6  DELETE optional accessory — succeeds (200/204)
 *   AC-7  DELETE non-optional item without override — 409
 *   AC-8  PUT updates qty, totals reflect change
 */

// ---------------------------------------------------------------------------
// Response type shapes
// ---------------------------------------------------------------------------

interface CartItem {
  id: string;
  item_type: 'device' | 'plan' | 'bundle' | 'accessory' | 'sim' | 'credit';
  product_id: string;
  product_name: string;
  variant_label: string | null;
  qty: number;
  once_off_price_cents: number;
  recurring_price_cents: number;
  tax_inclusive: boolean;
  is_optional: boolean;
  parent_item_id: string | null;
}

interface CartTotals {
  once_off_subtotal: number;
  recurring_subtotal: number;
  tax_amount: number;
  credits: number;
  total_once_off: number;
  total_monthly: number;
}

interface CartResponse {
  id: string;
  market: string;
  currency: string;
  items: CartItem[];
  totals: CartTotals;
}

interface AddItemRequest {
  item_type: string;
  product_id: string;
  product_name: string;
  variant_label?: string | null;
  qty: number;
  once_off_price_cents: number;
  recurring_price_cents: number;
  tax_inclusive?: boolean;
  is_optional?: boolean;
  parent_item_id?: string | null;
}

interface AddItemResponse {
  id: string;
  cart_id: string;
  item_type: string;
}

interface ErrorResponse {
  errorCode: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApp(): Application {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createApp } = require('../../app');
  return createApp();
}

/** Returns a supertest agent so session cookies persist across requests. */
function makeAgent(app: Application) {
  return request.agent(app);
}

async function getCart(
  agent: ReturnType<typeof makeAgent>,
): Promise<{ status: number; body: CartResponse }> {
  const res = await agent.get('/api/cart');
  return { status: res.status, body: res.body as CartResponse };
}

async function addItem(
  agent: ReturnType<typeof makeAgent>,
  payload: AddItemRequest,
): Promise<{ status: number; body: unknown }> {
  const res = await agent
    .post('/api/cart/items')
    .set('Content-Type', 'application/json')
    .send(payload);
  return { status: res.status, body: res.body };
}

async function updateItem(
  agent: ReturnType<typeof makeAgent>,
  itemId: string,
  patch: Partial<Pick<AddItemRequest, 'qty' | 'variant_label'>>,
): Promise<{ status: number; body: unknown }> {
  const res = await agent
    .put(`/api/cart/items/${itemId}`)
    .set('Content-Type', 'application/json')
    .send(patch);
  return { status: res.status, body: res.body };
}

async function deleteItem(
  agent: ReturnType<typeof makeAgent>,
  itemId: string,
  opts?: { force?: boolean },
): Promise<{ status: number; body: unknown }> {
  let req = agent.delete(`/api/cart/items/${itemId}`);
  if (opts?.force) {
    req = req.query({ force: 'true' });
  }
  const res = await req;
  return { status: res.status, body: res.body };
}

// ---------------------------------------------------------------------------
// Fixture items
// ---------------------------------------------------------------------------

const DEVICE_ITEM: AddItemRequest = {
  item_type: 'device',
  product_id: 'prod_device_iphone15',
  product_name: 'iPhone 15',
  variant_label: '128GB Black',
  qty: 1,
  once_off_price_cents: 1899900,   // R18,999.00
  recurring_price_cents: 0,
  tax_inclusive: false,
  is_optional: false,
  parent_item_id: null,
};

const PLAN_ITEM: AddItemRequest = {
  item_type: 'plan',
  product_id: 'plan_unlimited_20gb',
  product_name: 'Unlimited 20GB',
  variant_label: null,
  qty: 1,
  once_off_price_cents: 0,
  recurring_price_cents: 79900,    // R799.00/month
  tax_inclusive: false,
  is_optional: false,
  parent_item_id: null,            // parent_item_id linked to device id after insertion
};

const ACCESSORY_ITEM: AddItemRequest = {
  item_type: 'accessory',
  product_id: 'prod_case_leather',
  product_name: 'Leather Case',
  variant_label: 'Black',
  qty: 1,
  once_off_price_cents: 49900,     // R499.00
  recurring_price_cents: 0,
  tax_inclusive: false,
  is_optional: true,
  parent_item_id: null,
};

const SIM_ITEM: AddItemRequest = {
  item_type: 'sim',
  product_id: 'prod_sim_standard',
  product_name: 'Standard SIM',
  variant_label: null,
  qty: 1,
  once_off_price_cents: 0,
  recurring_price_cents: 0,
  tax_inclusive: false,
  is_optional: false,
  parent_item_id: null,
};

const BUNDLE_ITEM: AddItemRequest = {
  item_type: 'bundle',
  product_id: 'bundle_weekend_max',
  product_name: 'Weekend Max Bundle',
  variant_label: null,
  qty: 1,
  once_off_price_cents: 9900,      // R99.00
  recurring_price_cents: 0,
  tax_inclusive: false,
  is_optional: true,
  parent_item_id: null,
};

const CREDIT_ITEM: AddItemRequest = {
  item_type: 'credit',
  product_id: 'credit_trade_in_tiq782',
  product_name: 'Trade-In Credit: iPhone 12',
  variant_label: null,
  qty: 1,
  once_off_price_cents: -250000,   // R-2,500.00 credit (negative)
  recurring_price_cents: 0,
  tax_inclusive: false,
  is_optional: true,
  parent_item_id: null,
};

// ---------------------------------------------------------------------------
// AC-1  GET /api/cart — response shape
// ---------------------------------------------------------------------------

describe('GET /api/cart — response shape', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('returns HTTP 200', async () => {
    const agent = makeAgent(app);
    const { status } = await getCart(agent);
    expect(status).toBe(200);
  });

  it('response body contains an id string', async () => {
    const agent = makeAgent(app);
    const { body } = await getCart(agent);
    expect(typeof body.id).toBe('string');
    expect(body.id.length).toBeGreaterThan(0);
  });

  it('response body contains market string', async () => {
    const agent = makeAgent(app);
    const { body } = await getCart(agent);
    expect(typeof body.market).toBe('string');
  });

  it('response body contains currency string', async () => {
    const agent = makeAgent(app);
    const { body } = await getCart(agent);
    expect(typeof body.currency).toBe('string');
  });

  it('response body contains an items array', async () => {
    const agent = makeAgent(app);
    const { body } = await getCart(agent);
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('response body contains a totals object', async () => {
    const agent = makeAgent(app);
    const { body } = await getCart(agent);
    expect(body.totals).toBeDefined();
    expect(typeof body.totals).toBe('object');
  });

  it('totals object has all required fields', async () => {
    const agent = makeAgent(app);
    const { body } = await getCart(agent);
    const { totals } = body;
    expect(totals).toHaveProperty('once_off_subtotal');
    expect(totals).toHaveProperty('recurring_subtotal');
    expect(totals).toHaveProperty('tax_amount');
    expect(totals).toHaveProperty('credits');
    expect(totals).toHaveProperty('total_once_off');
    expect(totals).toHaveProperty('total_monthly');
  });

  it('all totals fields are numbers', async () => {
    const agent = makeAgent(app);
    const { body } = await getCart(agent);
    const { totals } = body;
    expect(typeof totals.once_off_subtotal).toBe('number');
    expect(typeof totals.recurring_subtotal).toBe('number');
    expect(typeof totals.tax_amount).toBe('number');
    expect(typeof totals.credits).toBe('number');
    expect(typeof totals.total_once_off).toBe('number');
    expect(typeof totals.total_monthly).toBe('number');
  });

  it('empty cart returns zeroed totals', async () => {
    const agent = makeAgent(app);
    const { body } = await getCart(agent);
    const { totals } = body;
    expect(totals.once_off_subtotal).toBe(0);
    expect(totals.recurring_subtotal).toBe(0);
    expect(totals.tax_amount).toBe(0);
    expect(totals.credits).toBe(0);
    expect(totals.total_once_off).toBe(0);
    expect(totals.total_monthly).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC-2  POST /api/cart/items — add device + plan, item shape
// ---------------------------------------------------------------------------

describe('POST /api/cart/items — add device + plan', () => {
  let app: Application;
  let agent: ReturnType<typeof makeAgent>;
  let deviceItemId: string;
  let cartAfterDevice: CartResponse;
  let cartAfterPlan: CartResponse;

  beforeAll(async () => {
    app = getApp();
    agent = makeAgent(app);

    // Add device
    const deviceRes = await addItem(agent, DEVICE_ITEM);
    expect(deviceRes.status).toBe(201);
    deviceItemId = (deviceRes.body as AddItemResponse).id;

    // Add plan attached to device
    const planRes = await addItem(agent, { ...PLAN_ITEM, parent_item_id: deviceItemId });
    expect(planRes.status).toBe(201);

    // Snapshot cart after device-only, then after plan
    const afterDevice = await addItem(makeAgent(app), DEVICE_ITEM);
    deviceItemId = (afterDevice.body as AddItemResponse).id;
    const freshAgent = makeAgent(app);
    await addItem(freshAgent, DEVICE_ITEM);
    cartAfterDevice = (await getCart(freshAgent)).body;

    await addItem(freshAgent, { ...PLAN_ITEM, parent_item_id: deviceItemId });
    cartAfterPlan = (await getCart(freshAgent)).body;
  });

  it('POST /api/cart/items returns HTTP 201', async () => {
    const a = makeAgent(app);
    const res = await addItem(a, DEVICE_ITEM);
    expect(res.status).toBe(201);
  });

  it('response body contains the new item id', async () => {
    const a = makeAgent(app);
    const res = await addItem(a, DEVICE_ITEM);
    const body = res.body as AddItemResponse;
    expect(typeof body.id).toBe('string');
    expect(body.id.length).toBeGreaterThan(0);
  });

  it('response body echoes item_type', async () => {
    const a = makeAgent(app);
    const res = await addItem(a, DEVICE_ITEM);
    const body = res.body as AddItemResponse;
    expect(body.item_type).toBe('device');
  });

  it('GET /api/cart reflects the added device item', () => {
    const deviceInCart = cartAfterDevice.items.find(
      (i: CartItem) => i.item_type === 'device',
    );
    expect(deviceInCart).toBeDefined();
    expect(deviceInCart!.product_id).toBe(DEVICE_ITEM.product_id);
  });

  it('GET /api/cart reflects the added plan item with device as parent', () => {
    const planInCart = cartAfterPlan.items.find(
      (i: CartItem) => i.item_type === 'plan',
    );
    expect(planInCart).toBeDefined();
    expect(planInCart!.product_id).toBe(PLAN_ITEM.product_id);
    expect(planInCart!.parent_item_id).toBe(deviceItemId);
  });

  it('each cart item has all required fields', () => {
    for (const item of cartAfterPlan.items) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('item_type');
      expect(item).toHaveProperty('product_id');
      expect(item).toHaveProperty('product_name');
      expect(item).toHaveProperty('variant_label');
      expect(item).toHaveProperty('qty');
      expect(item).toHaveProperty('once_off_price_cents');
      expect(item).toHaveProperty('recurring_price_cents');
      expect(item).toHaveProperty('tax_inclusive');
      expect(item).toHaveProperty('is_optional');
      expect(item).toHaveProperty('parent_item_id');
    }
  });

  it('item_type values are from the allowed enum', () => {
    const allowed = ['device', 'plan', 'bundle', 'accessory', 'sim', 'credit'];
    for (const item of cartAfterPlan.items) {
      expect(allowed).toContain(item.item_type);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-3  Items grouped by type — all six item_type variants representable
// ---------------------------------------------------------------------------

describe('GET /api/cart — items grouped by all item_type variants', () => {
  let app: Application;
  let agent: ReturnType<typeof makeAgent>;
  let cartBody: CartResponse;

  beforeAll(async () => {
    app = getApp();
    agent = makeAgent(app);

    // Add one of every item type
    await addItem(agent, DEVICE_ITEM);
    await addItem(agent, PLAN_ITEM);
    await addItem(agent, ACCESSORY_ITEM);
    await addItem(agent, SIM_ITEM);
    await addItem(agent, BUNDLE_ITEM);
    await addItem(agent, CREDIT_ITEM);

    const res = await getCart(agent);
    cartBody = res.body;
  });

  const expectedTypes: Array<CartItem['item_type']> = [
    'device', 'plan', 'accessory', 'sim', 'bundle', 'credit',
  ];

  for (const itemType of expectedTypes) {
    it(`cart contains at least one item with item_type="${itemType}"`, () => {
      const found = cartBody.items.some((i: CartItem) => i.item_type === itemType);
      expect(found).toBe(true);
    });
  }

  it('device item has the correct once_off_price_cents', () => {
    const device = cartBody.items.find((i: CartItem) => i.item_type === 'device')!;
    expect(device.once_off_price_cents).toBe(DEVICE_ITEM.once_off_price_cents);
  });

  it('plan item has the correct recurring_price_cents', () => {
    const plan = cartBody.items.find((i: CartItem) => i.item_type === 'plan')!;
    expect(plan.recurring_price_cents).toBe(PLAN_ITEM.recurring_price_cents);
  });

  it('credit item has a negative once_off_price_cents', () => {
    const credit = cartBody.items.find((i: CartItem) => i.item_type === 'credit')!;
    expect(credit.once_off_price_cents).toBeLessThan(0);
  });

  it('accessory item is_optional is true', () => {
    const acc = cartBody.items.find((i: CartItem) => i.item_type === 'accessory')!;
    expect(acc.is_optional).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-4  Tax calculation at 15% ZAR, integer-cent rounding
// ---------------------------------------------------------------------------

describe('Totals — tax calculation at 15% ZAR', () => {
  let app: Application;

  it('tax_amount equals round(once_off_subtotal * 0.15) for a device-only cart', async () => {
    const agent = makeAgent(app ?? (app = getApp()));
    await addItem(agent, DEVICE_ITEM);
    const { body } = await getCart(agent);
    const { totals } = body;

    // DEVICE_ITEM: once_off_price_cents = 1899900, qty = 1
    const expectedSubtotal = 1899900;
    const expectedTax = Math.round(expectedSubtotal * 0.15);  // 284985

    expect(totals.once_off_subtotal).toBe(expectedSubtotal);
    expect(totals.tax_amount).toBe(expectedTax);
  });

  it('tax_amount is a non-negative integer (whole cents)', async () => {
    const agent = makeAgent(getApp());
    await addItem(agent, DEVICE_ITEM);
    const { body } = await getCart(agent);
    expect(Number.isInteger(body.totals.tax_amount)).toBe(true);
    expect(body.totals.tax_amount).toBeGreaterThanOrEqual(0);
  });

  it('total_once_off = once_off_subtotal + tax_amount + credits for device-only cart', async () => {
    const agent = makeAgent(getApp());
    await addItem(agent, DEVICE_ITEM);
    const { body } = await getCart(agent);
    const { totals } = body;

    const expected = totals.once_off_subtotal + totals.tax_amount + totals.credits;
    expect(totals.total_once_off).toBe(expected);
  });

  it('recurring items do not contribute to tax_amount', async () => {
    const agent = makeAgent(getApp());
    await addItem(agent, PLAN_ITEM);  // only recurring, no once_off
    const { body } = await getCart(agent);
    expect(body.totals.once_off_subtotal).toBe(0);
    expect(body.totals.tax_amount).toBe(0);
  });

  it('total_monthly equals recurring_subtotal (no tax on monthly)', async () => {
    const agent = makeAgent(getApp());
    await addItem(agent, PLAN_ITEM);
    const { body } = await getCart(agent);
    expect(body.totals.total_monthly).toBe(body.totals.recurring_subtotal);
    expect(body.totals.total_monthly).toBe(PLAN_ITEM.recurring_price_cents);
  });

  it('tax rounds correctly for an amount producing a fractional cent', async () => {
    // once_off = 100 cents → tax = round(100 * 0.15) = round(15.0) = 15
    // once_off = 101 cents → tax = round(101 * 0.15) = round(15.15) = 15
    // once_off = 107 cents → tax = round(107 * 0.15) = round(16.05) = 16
    const agent = makeAgent(getApp());
    const oddItem: AddItemRequest = {
      item_type: 'accessory',
      product_id: 'prod_test_odd',
      product_name: 'Odd Price Accessory',
      variant_label: null,
      qty: 1,
      once_off_price_cents: 107,
      recurring_price_cents: 0,
      tax_inclusive: false,
      is_optional: true,
      parent_item_id: null,
    };
    await addItem(agent, oddItem);
    const { body } = await getCart(agent);
    expect(body.totals.tax_amount).toBe(16);
  });
});

// ---------------------------------------------------------------------------
// AC-5  Trade-in credit application
// ---------------------------------------------------------------------------

describe('Totals — trade-in credit application', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('credits field equals the absolute sum of credit item amounts', async () => {
    const agent = makeAgent(app);
    await addItem(agent, CREDIT_ITEM);
    const { body } = await getCart(agent);
    // credits stores the credit sum (negative contribution)
    expect(body.totals.credits).toBe(CREDIT_ITEM.once_off_price_cents);  // -250000
  });

  it('total_once_off is reduced by the trade-in credit amount', async () => {
    const agent = makeAgent(app);
    await addItem(agent, DEVICE_ITEM);
    const cartBefore = (await getCart(agent)).body;

    await addItem(agent, CREDIT_ITEM);
    const cartAfter = (await getCart(agent)).body;

    // total_once_off should decrease by the credit amount
    const expectedReduction = Math.abs(CREDIT_ITEM.once_off_price_cents);
    expect(cartBefore.totals.total_once_off - cartAfter.totals.total_once_off)
      .toBe(expectedReduction);
  });

  it('once_off_subtotal does NOT include credit items', async () => {
    const agent = makeAgent(app);
    await addItem(agent, DEVICE_ITEM);
    await addItem(agent, CREDIT_ITEM);
    const { body } = await getCart(agent);

    // Subtotal is the gross positive total only
    expect(body.totals.once_off_subtotal).toBe(DEVICE_ITEM.once_off_price_cents);
  });

  it('total_once_off = once_off_subtotal + tax_amount + credits (with credit negative)', async () => {
    const agent = makeAgent(app);
    await addItem(agent, DEVICE_ITEM);
    await addItem(agent, CREDIT_ITEM);
    const { body } = await getCart(agent);
    const { totals } = body;

    expect(totals.total_once_off).toBe(
      totals.once_off_subtotal + totals.tax_amount + totals.credits,
    );
  });
});

// ---------------------------------------------------------------------------
// AC-6  DELETE /api/cart/items/:id — optional accessory succeeds
// ---------------------------------------------------------------------------

describe('DELETE /api/cart/items/:id — optional item', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('returns 200 or 204 when deleting an optional accessory', async () => {
    const agent = makeAgent(app);
    const res = await addItem(agent, ACCESSORY_ITEM);
    const itemId = (res.body as AddItemResponse).id;

    const del = await deleteItem(agent, itemId);
    expect([200, 204]).toContain(del.status);
  });

  it('deleted item no longer appears in GET /api/cart', async () => {
    const agent = makeAgent(app);
    const res = await addItem(agent, ACCESSORY_ITEM);
    const itemId = (res.body as AddItemResponse).id;

    await deleteItem(agent, itemId);

    const { body } = await getCart(agent);
    const stillPresent = body.items.some((i: CartItem) => i.id === itemId);
    expect(stillPresent).toBe(false);
  });

  it('totals are recalculated after removing optional accessory', async () => {
    const agent = makeAgent(app);
    await addItem(agent, DEVICE_ITEM);
    const accRes = await addItem(agent, ACCESSORY_ITEM);
    const accId = (accRes.body as AddItemResponse).id;

    const cartBefore = (await getCart(agent)).body;
    await deleteItem(agent, accId);
    const cartAfter = (await getCart(agent)).body;

    // Removing accessory (49900 once_off) should reduce subtotal
    expect(cartAfter.totals.once_off_subtotal)
      .toBe(cartBefore.totals.once_off_subtotal - ACCESSORY_ITEM.once_off_price_cents);
  });

  it('returns 200 or 204 when deleting an optional credit item', async () => {
    const agent = makeAgent(app);
    const res = await addItem(agent, CREDIT_ITEM);
    const itemId = (res.body as AddItemResponse).id;

    const del = await deleteItem(agent, itemId);
    expect([200, 204]).toContain(del.status);
  });
});

// ---------------------------------------------------------------------------
// AC-7  DELETE /api/cart/items/:id — non-optional item returns 409
// ---------------------------------------------------------------------------

describe('DELETE /api/cart/items/:id — non-optional item', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('returns 409 when deleting a non-optional device item', async () => {
    const agent = makeAgent(app);
    const res = await addItem(agent, DEVICE_ITEM);
    const itemId = (res.body as AddItemResponse).id;

    const del = await deleteItem(agent, itemId);
    expect(del.status).toBe(409);
  });

  it('409 response body contains an errorCode', async () => {
    const agent = makeAgent(app);
    const res = await addItem(agent, DEVICE_ITEM);
    const itemId = (res.body as AddItemResponse).id;

    const del = await deleteItem(agent, itemId);
    const body = del.body as ErrorResponse;
    expect(typeof body.errorCode).toBe('string');
    expect(body.errorCode.length).toBeGreaterThan(0);
  });

  it('409 response body contains a message', async () => {
    const agent = makeAgent(app);
    const res = await addItem(agent, DEVICE_ITEM);
    const itemId = (res.body as AddItemResponse).id;

    const del = await deleteItem(agent, itemId);
    const body = del.body as ErrorResponse;
    expect(typeof body.message).toBe('string');
    expect(body.message.length).toBeGreaterThan(0);
  });

  it('returns 409 when deleting a non-optional plan item', async () => {
    const agent = makeAgent(app);
    const res = await addItem(agent, PLAN_ITEM);
    const itemId = (res.body as AddItemResponse).id;

    const del = await deleteItem(agent, itemId);
    expect(del.status).toBe(409);
  });

  it('returns 409 when deleting a non-optional SIM item', async () => {
    const agent = makeAgent(app);
    const res = await addItem(agent, SIM_ITEM);
    const itemId = (res.body as AddItemResponse).id;

    const del = await deleteItem(agent, itemId);
    expect(del.status).toBe(409);
  });

  it('non-optional item remains in cart after failed DELETE', async () => {
    const agent = makeAgent(app);
    const res = await addItem(agent, DEVICE_ITEM);
    const itemId = (res.body as AddItemResponse).id;

    await deleteItem(agent, itemId);

    const { body } = await getCart(agent);
    const stillPresent = body.items.some((i: CartItem) => i.id === itemId);
    expect(stillPresent).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-8  PUT /api/cart/items/:id — update qty; totals recalculated
// ---------------------------------------------------------------------------

describe('PUT /api/cart/items/:id — update qty', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('returns 200 when updating qty of an accessory', async () => {
    const agent = makeAgent(app);
    const addRes = await addItem(agent, ACCESSORY_ITEM);
    const itemId = (addRes.body as AddItemResponse).id;

    const upd = await updateItem(agent, itemId, { qty: 2 });
    expect(upd.status).toBe(200);
  });

  it('updated qty is reflected in GET /api/cart', async () => {
    const agent = makeAgent(app);
    const addRes = await addItem(agent, ACCESSORY_ITEM);
    const itemId = (addRes.body as AddItemResponse).id;

    await updateItem(agent, itemId, { qty: 3 });

    const { body } = await getCart(agent);
    const item = body.items.find((i: CartItem) => i.id === itemId);
    expect(item).toBeDefined();
    expect(item!.qty).toBe(3);
  });

  it('once_off_subtotal scales with updated qty', async () => {
    const agent = makeAgent(app);
    const addRes = await addItem(agent, ACCESSORY_ITEM);  // 49900 once_off
    const itemId = (addRes.body as AddItemResponse).id;

    await updateItem(agent, itemId, { qty: 2 });

    const { body } = await getCart(agent);
    expect(body.totals.once_off_subtotal).toBe(ACCESSORY_ITEM.once_off_price_cents * 2);
  });

  it('tax_amount scales correctly after qty update', async () => {
    const agent = makeAgent(app);
    const addRes = await addItem(agent, ACCESSORY_ITEM);
    const itemId = (addRes.body as AddItemResponse).id;

    await updateItem(agent, itemId, { qty: 2 });

    const { body } = await getCart(agent);
    const expectedSubtotal = ACCESSORY_ITEM.once_off_price_cents * 2;
    const expectedTax = Math.round(expectedSubtotal * 0.15);
    expect(body.totals.tax_amount).toBe(expectedTax);
  });

  it('returns 200 when updating variant_label', async () => {
    const agent = makeAgent(app);
    const addRes = await addItem(agent, ACCESSORY_ITEM);
    const itemId = (addRes.body as AddItemResponse).id;

    const upd = await updateItem(agent, itemId, { variant_label: 'White' });
    expect(upd.status).toBe(200);
  });

  it('updated variant_label is reflected in GET /api/cart', async () => {
    const agent = makeAgent(app);
    const addRes = await addItem(agent, ACCESSORY_ITEM);
    const itemId = (addRes.body as AddItemResponse).id;

    await updateItem(agent, itemId, { variant_label: 'White' });

    const { body } = await getCart(agent);
    const item = body.items.find((i: CartItem) => i.id === itemId);
    expect(item).toBeDefined();
    expect(item!.variant_label).toBe('White');
  });

  it('returns 404 with errorCode when updating a non-existent item id', async () => {
    const agent = makeAgent(app);
    const upd = await updateItem(agent, 'nonexistent-item-id-xyz', { qty: 5 });
    expect(upd.status).toBe(404);
    const body = upd.body as ErrorResponse;
    expect(typeof body.errorCode).toBe('string');
    expect(body.errorCode.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-9  Totals recalculate on every mutation
// ---------------------------------------------------------------------------

describe('Totals — recalculated on every mutation', () => {
  let app: Application;

  beforeAll(() => {
    app = getApp();
  });

  it('once_off_subtotal increases after adding a second item', async () => {
    const agent = makeAgent(app);
    await addItem(agent, DEVICE_ITEM);
    const cartAfterDevice = (await getCart(agent)).body;

    await addItem(agent, ACCESSORY_ITEM);
    const cartAfterAccessory = (await getCart(agent)).body;

    expect(cartAfterAccessory.totals.once_off_subtotal)
      .toBeGreaterThan(cartAfterDevice.totals.once_off_subtotal);
    expect(cartAfterAccessory.totals.once_off_subtotal)
      .toBe(DEVICE_ITEM.once_off_price_cents + ACCESSORY_ITEM.once_off_price_cents);
  });

  it('recurring_subtotal increases after adding a plan item', async () => {
    const agent = makeAgent(app);
    const cartBefore = (await getCart(agent)).body;
    await addItem(agent, PLAN_ITEM);
    const cartAfter = (await getCart(agent)).body;

    expect(cartAfter.totals.recurring_subtotal)
      .toBeGreaterThan(cartBefore.totals.recurring_subtotal);
    expect(cartAfter.totals.recurring_subtotal).toBe(PLAN_ITEM.recurring_price_cents);
  });

  it('total_once_off = once_off_subtotal + tax_amount + credits in all cases', async () => {
    const agent = makeAgent(app);
    await addItem(agent, DEVICE_ITEM);
    await addItem(agent, ACCESSORY_ITEM);
    await addItem(agent, CREDIT_ITEM);
    const { body } = await getCart(agent);
    const { totals } = body;

    expect(totals.total_once_off).toBe(
      totals.once_off_subtotal + totals.tax_amount + totals.credits,
    );
  });

  it('total_monthly = recurring_subtotal (no other components)', async () => {
    const agent = makeAgent(app);
    await addItem(agent, PLAN_ITEM);
    const { body } = await getCart(agent);
    expect(body.totals.total_monthly).toBe(body.totals.recurring_subtotal);
  });
});
