/**
 * Acceptance tests for TMF622 resource types and IOrderingAdapter.
 *
 * Acceptance criteria:
 *   AC-1  src/integration/types/tmf622.ts exports ProductOrder, ProductOrderItem,
 *         OrderItemRelationship, ProductOrderStateType.
 *   AC-2  src/integration/adapters/IOrderingAdapter.ts exports IOrderingAdapter.
 *   AC-3  ProductOrder uses 'productOrderItem' (not 'lineItem' or 'items').
 *   AC-4  IOrderingAdapter method signatures use only TMF622 resource types.
 *   AC-5  IOrderingAdapter file contains inline JSDoc referencing TMF622.
 *   AC-6  Type file has zero runtime dependencies.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '../..');
const TMF622_TYPES_FILE     = path.join(SRC_ROOT, 'integration', 'types', 'tmf622.ts');
const ORDERING_ADAPTER_FILE  = path.join(SRC_ROOT, 'integration', 'adapters', 'IOrderingAdapter.ts');

// ─── AC-1 / AC-2  File existence ────────────────────────────────────────────

describe('TMF622 — file existence', () => {
  it('src/integration/types/tmf622.ts exists', () => {
    expect(fs.existsSync(TMF622_TYPES_FILE)).toBe(true);
  });

  it('src/integration/adapters/IOrderingAdapter.ts exists', () => {
    expect(fs.existsSync(ORDERING_ADAPTER_FILE)).toBe(true);
  });
});

// ─── AC-3  TMF622 attribute naming ──────────────────────────────────────────

import type {
  ProductOrder,
  ProductOrderItem,
  OrderItemRelationship,
  ProductOrderStateType,
} from '../../integration/types/tmf622';

describe('TMF622 — ProductOrder attribute names', () => {
  it("ProductOrder uses 'productOrderItem' (not 'lineItem')", () => {
    const order: ProductOrder = {
      id: 'ord-001',
      state: 'acknowledged',
      productOrderItem: [],
    };
    expect(Object.prototype.hasOwnProperty.call(order, 'productOrderItem')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(order, 'lineItem')).toBe(false);
  });

  it("ProductOrder uses 'productOrderItem' (not 'items')", () => {
    const order: ProductOrder = {
      id: 'ord-002',
      state: 'inProgress',
      productOrderItem: [],
    };
    expect(Object.prototype.hasOwnProperty.call(order, 'items')).toBe(false);
  });

  it('ProductOrder has a string id field', () => {
    const order: ProductOrder = { id: 'ord-003', state: 'completed', productOrderItem: [] };
    expect(typeof order.id).toBe('string');
  });

  it('ProductOrder state field is assignable from ProductOrderStateType', () => {
    const state: ProductOrderStateType = 'acknowledged';
    const order: ProductOrder = { id: 'ord-004', state, productOrderItem: [] };
    expect(order.state).toBe('acknowledged');
  });
});

describe('TMF622 — ProductOrderItem attribute names', () => {
  it('ProductOrderItem has a string id field', () => {
    const item: ProductOrderItem = { id: 'poi-001', action: 'add' };
    expect(typeof item.id).toBe('string');
  });

  it("ProductOrderItem uses 'action' field (standard TMF622 attribute)", () => {
    const item: ProductOrderItem = { id: 'poi-002', action: 'modify' };
    expect(Object.prototype.hasOwnProperty.call(item, 'action')).toBe(true);
  });

  it('OrderItemRelationship has id and relationshipType fields', () => {
    const rel: OrderItemRelationship = { id: 'rel-001', relationshipType: 'bundles' };
    expect(typeof rel.id).toBe('string');
    expect(typeof rel.relationshipType).toBe('string');
  });
});

describe('TMF622 — ProductOrderStateType values', () => {
  it("'acknowledged' is a valid ProductOrderStateType", () => {
    const s: ProductOrderStateType = 'acknowledged';
    expect(s).toBe('acknowledged');
  });

  it("'inProgress' is a valid ProductOrderStateType", () => {
    const s: ProductOrderStateType = 'inProgress';
    expect(s).toBe('inProgress');
  });

  it("'completed' is a valid ProductOrderStateType", () => {
    const s: ProductOrderStateType = 'completed';
    expect(s).toBe('completed');
  });

  it("'failed' is a valid ProductOrderStateType", () => {
    const s: ProductOrderStateType = 'failed';
    expect(s).toBe('failed');
  });
});

// ─── AC-4  IOrderingAdapter method signatures ────────────────────────────────

import type { IOrderingAdapter } from '../../integration/adapters/IOrderingAdapter';

class StubOrderingAdapter implements IOrderingAdapter {
  async createProductOrder(order: ProductOrder): Promise<ProductOrder> {
    return { ...order, id: 'ord-created' };
  }

  async getProductOrder(id: string): Promise<ProductOrder> {
    return { id, state: 'acknowledged', productOrderItem: [] };
  }
}

describe('TMF622 — IOrderingAdapter interface', () => {
  it('IOrderingAdapter can be implemented with TMF622 types', () => {
    const adapter: IOrderingAdapter = new StubOrderingAdapter();
    expect(adapter).toBeDefined();
  });

  it('IOrderingAdapter.createProductOrder returns a ProductOrder promise', async () => {
    const adapter: IOrderingAdapter = new StubOrderingAdapter();
    const result = await adapter.createProductOrder({
      id: '',
      state: 'acknowledged',
      productOrderItem: [],
    });
    expect(result).toBeDefined();
    expect(typeof result.id).toBe('string');
  });

  it('IOrderingAdapter.getProductOrder returns a ProductOrder promise', async () => {
    const adapter: IOrderingAdapter = new StubOrderingAdapter();
    const result = await adapter.getProductOrder('ord-001');
    expect(result).toBeDefined();
    expect(result.id).toBe('ord-001');
  });
});

// ─── AC-5  JSDoc references TMF622 ──────────────────────────────────────────

describe('TMF622 — adapter JSDoc references Open API number', () => {
  it('IOrderingAdapter.ts contains a reference to TMF622', () => {
    const content = fs.readFileSync(ORDERING_ADAPTER_FILE, 'utf-8');
    expect(content).toMatch(/TMF622|TMF-622|622/);
  });

  it('IOrderingAdapter.ts references ProductOrder', () => {
    const content = fs.readFileSync(ORDERING_ADAPTER_FILE, 'utf-8');
    expect(content).toMatch(/ProductOrder/);
  });
});

// ─── AC-6  Zero runtime dependencies ────────────────────────────────────────

describe('TMF622 — zero runtime dependencies', () => {
  it('tmf622.ts module has no runtime value exports', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../integration/types/tmf622') as Record<string, unknown>;
    const runtimeValueExports = Object.keys(mod).filter(
      (k) => typeof mod[k] !== 'undefined',
    );
    expect(runtimeValueExports).toHaveLength(0);
  });
});
