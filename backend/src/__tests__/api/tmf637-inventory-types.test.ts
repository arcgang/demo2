/**
 * Acceptance tests for TMF637 resource types and IInventoryAdapter.
 *
 * Acceptance criteria:
 *   AC-1  src/integration/types/tmf637.ts exports ProductInventory,
 *         CheckProductStockRequest, CheckProductStockResponse.
 *   AC-2  src/integration/adapters/IInventoryAdapter.ts exports IInventoryAdapter.
 *   AC-3  Types use TMF637 attribute names (no bespoke aliases).
 *   AC-4  IInventoryAdapter method signatures use only TMF637 resource types.
 *   AC-5  IInventoryAdapter file contains inline JSDoc referencing TMF637.
 *   AC-6  Type file has zero runtime dependencies.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '../..');
const TMF637_TYPES_FILE      = path.join(SRC_ROOT, 'integration', 'types', 'tmf637.ts');
const INVENTORY_ADAPTER_FILE = path.join(SRC_ROOT, 'integration', 'adapters', 'IInventoryAdapter.ts');

// ─── AC-1 / AC-2  File existence ────────────────────────────────────────────

describe('TMF637 — file existence', () => {
  it('src/integration/types/tmf637.ts exists', () => {
    expect(fs.existsSync(TMF637_TYPES_FILE)).toBe(true);
  });

  it('src/integration/adapters/IInventoryAdapter.ts exists', () => {
    expect(fs.existsSync(INVENTORY_ADAPTER_FILE)).toBe(true);
  });
});

// ─── AC-3  TMF637 attribute naming ──────────────────────────────────────────

import type {
  ProductInventory,
  CheckProductStockRequest,
  CheckProductStockResponse,
} from '../../integration/types/tmf637';

describe('TMF637 — ProductInventory attribute names', () => {
  it('ProductInventory has a string id field', () => {
    const inv: ProductInventory = { id: 'pi-001' };
    expect(typeof inv.id).toBe('string');
  });

  it('ProductInventory uses status (not stockStatus or inventoryStatus)', () => {
    const inv: ProductInventory = { id: 'pi-002', status: 'inStock' };
    expect(Object.prototype.hasOwnProperty.call(inv, 'status')).toBe(true);
  });
});

describe('TMF637 — CheckProductStockRequest attribute names', () => {
  it('CheckProductStockRequest has productId field', () => {
    const req: CheckProductStockRequest = { productId: 'prod-001' };
    expect(Object.prototype.hasOwnProperty.call(req, 'productId')).toBe(true);
  });
});

describe('TMF637 — CheckProductStockResponse attribute names', () => {
  it('CheckProductStockResponse has productId and availableQuantity fields', () => {
    const resp: CheckProductStockResponse = {
      productId: 'prod-001',
      availableQuantity: 10,
    };
    expect(Object.prototype.hasOwnProperty.call(resp, 'productId')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(resp, 'availableQuantity')).toBe(true);
  });

  it('availableQuantity is a number', () => {
    const resp: CheckProductStockResponse = { productId: 'prod-002', availableQuantity: 5 };
    expect(typeof resp.availableQuantity).toBe('number');
  });
});

// ─── AC-4  IInventoryAdapter method signatures ──────────────────────────────

import type { IInventoryAdapter } from '../../integration/adapters/IInventoryAdapter';

class StubInventoryAdapter implements IInventoryAdapter {
  async getProductInventory(id: string): Promise<ProductInventory> {
    return { id };
  }

  async checkProductStock(
    request: CheckProductStockRequest,
  ): Promise<CheckProductStockResponse> {
    return { productId: request.productId, availableQuantity: 99 };
  }
}

describe('TMF637 — IInventoryAdapter interface', () => {
  it('IInventoryAdapter can be implemented with TMF637 types', () => {
    const adapter: IInventoryAdapter = new StubInventoryAdapter();
    expect(adapter).toBeDefined();
  });

  it('IInventoryAdapter.getProductInventory returns a ProductInventory promise', async () => {
    const adapter: IInventoryAdapter = new StubInventoryAdapter();
    const result = await adapter.getProductInventory('pi-001');
    expect(result).toBeDefined();
    expect(typeof result.id).toBe('string');
  });

  it('IInventoryAdapter.checkProductStock returns a CheckProductStockResponse promise', async () => {
    const adapter: IInventoryAdapter = new StubInventoryAdapter();
    const result = await adapter.checkProductStock({ productId: 'prod-001' });
    expect(result).toBeDefined();
    expect(typeof result.availableQuantity).toBe('number');
  });
});

// ─── AC-5  JSDoc references TMF637 ──────────────────────────────────────────

describe('TMF637 — adapter JSDoc references Open API number', () => {
  it('IInventoryAdapter.ts contains a reference to TMF637', () => {
    const content = fs.readFileSync(INVENTORY_ADAPTER_FILE, 'utf-8');
    expect(content).toMatch(/TMF637|TMF-637|637/);
  });

  it('IInventoryAdapter.ts references ProductInventory or stock', () => {
    const content = fs.readFileSync(INVENTORY_ADAPTER_FILE, 'utf-8');
    expect(content).toMatch(/ProductInventory|stock|Stock/);
  });
});

// ─── AC-6  Zero runtime dependencies ────────────────────────────────────────

describe('TMF637 — zero runtime dependencies', () => {
  it('tmf637.ts module has no runtime value exports', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../integration/types/tmf637') as Record<string, unknown>;
    const runtimeValueExports = Object.keys(mod).filter(
      (k) => typeof mod[k] !== 'undefined',
    );
    expect(runtimeValueExports).toHaveLength(0);
  });
});
