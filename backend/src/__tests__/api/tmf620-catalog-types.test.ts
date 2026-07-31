/**
 * Acceptance tests for TMF620 resource types and ICatalogAdapter.
 *
 * Acceptance criteria:
 *   AC-1  src/integration/types/tmf620.ts exists and exports ProductOffering,
 *         ProductSpecification, ProductOfferingPrice, BundledProductOffering.
 *   AC-2  src/integration/adapters/ICatalogAdapter.ts exists and exports ICatalogAdapter.
 *   AC-3  ProductOffering uses TMF620 attribute names (productSpecification,
 *         productOfferingPrice, bundledProductOffering) — no bespoke aliases.
 *   AC-4  ICatalogAdapter method signatures use only TMF620 resource types.
 *   AC-5  ICatalogAdapter file contains inline JSDoc referencing TMF620.
 *   AC-6  Type files have zero runtime dependencies (no runtime-value exports
 *         from external packages).
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '../..');
const TMF620_TYPES_FILE   = path.join(SRC_ROOT, 'integration', 'types', 'tmf620.ts');
const CATALOG_ADAPTER_FILE = path.join(SRC_ROOT, 'integration', 'adapters', 'ICatalogAdapter.ts');

// ─── AC-1 / AC-2  File existence ────────────────────────────────────────────

describe('TMF620 — file existence', () => {
  it('src/integration/types/tmf620.ts exists', () => {
    expect(fs.existsSync(TMF620_TYPES_FILE)).toBe(true);
  });

  it('src/integration/adapters/ICatalogAdapter.ts exists', () => {
    expect(fs.existsSync(CATALOG_ADAPTER_FILE)).toBe(true);
  });
});

// ─── AC-3  TMF620 attribute naming ──────────────────────────────────────────

import type {
  ProductOffering,
  ProductSpecification,
  ProductOfferingPrice,
  BundledProductOffering,
} from '../../integration/types/tmf620';

describe('TMF620 — ProductOffering attribute names', () => {
  it('ProductOffering uses productSpecification (not spec or productSpec)', () => {
    const offering: ProductOffering = {
      id: 'po-001',
      name: 'Unlimited 20GB',
      productSpecification: { id: 'ps-001', name: 'Device Spec' },
    };
    expect(Object.prototype.hasOwnProperty.call(offering, 'productSpecification')).toBe(true);
  });

  it('ProductOffering uses productOfferingPrice (not prices or pricingOptions)', () => {
    const offering: ProductOffering = {
      id: 'po-002',
      name: 'Red Premium',
      productOfferingPrice: [],
    };
    expect(Object.prototype.hasOwnProperty.call(offering, 'productOfferingPrice')).toBe(true);
  });

  it('ProductOffering uses bundledProductOffering (not bundles or childOfferings)', () => {
    const offering: ProductOffering = {
      id: 'po-003',
      name: 'Weekend Bundle',
      bundledProductOffering: [],
    };
    expect(Object.prototype.hasOwnProperty.call(offering, 'bundledProductOffering')).toBe(true);
  });

  it('ProductOffering has a string id field', () => {
    const offering: ProductOffering = { id: 'po-004', name: 'Basic SIM' };
    expect(typeof offering.id).toBe('string');
  });

  it('ProductOffering has a string name field', () => {
    const offering: ProductOffering = { id: 'po-005', name: 'eSIM Data' };
    expect(typeof offering.name).toBe('string');
  });
});

describe('TMF620 — ProductSpecification attribute names', () => {
  it('ProductSpecification has a string id field', () => {
    const spec: ProductSpecification = { id: 'ps-001', name: 'iPhone 15 Spec' };
    expect(typeof spec.id).toBe('string');
  });

  it('ProductSpecification has a string name field', () => {
    const spec: ProductSpecification = { id: 'ps-002', name: 'Galaxy S24 Spec' };
    expect(typeof spec.name).toBe('string');
  });
});

describe('TMF620 — ProductOfferingPrice attribute names', () => {
  it('ProductOfferingPrice has a string id field', () => {
    const price: ProductOfferingPrice = { id: 'pop-001', name: 'Once-off price' };
    expect(typeof price.id).toBe('string');
  });

  it('ProductOfferingPrice has a name field', () => {
    const price: ProductOfferingPrice = { id: 'pop-002', name: 'Monthly fee' };
    expect(typeof price.name).toBe('string');
  });
});

describe('TMF620 — BundledProductOffering attribute names', () => {
  it('BundledProductOffering has a string id field', () => {
    const bundled: BundledProductOffering = { id: 'bpo-001' };
    expect(typeof bundled.id).toBe('string');
  });
});

// ─── AC-4  ICatalogAdapter method signatures ────────────────────────────────

import type { ICatalogAdapter } from '../../integration/adapters/ICatalogAdapter';

class StubCatalogAdapter implements ICatalogAdapter {
  async getProductOffering(id: string): Promise<ProductOffering> {
    return { id, name: 'stub' };
  }

  async getProductSpecification(id: string): Promise<ProductSpecification> {
    return { id, name: 'stub spec' };
  }

  async listProductOfferings(filter?: Partial<ProductOffering>): Promise<ProductOffering[]> {
    void filter;
    return [];
  }
}

describe('TMF620 — ICatalogAdapter interface', () => {
  it('ICatalogAdapter can be implemented with TMF620 types', () => {
    const adapter: ICatalogAdapter = new StubCatalogAdapter();
    expect(adapter).toBeDefined();
  });

  it('ICatalogAdapter.getProductOffering returns a ProductOffering promise', async () => {
    const adapter: ICatalogAdapter = new StubCatalogAdapter();
    const result = await adapter.getProductOffering('po-001');
    expect(result).toBeDefined();
    expect(typeof result.id).toBe('string');
  });

  it('ICatalogAdapter.getProductSpecification returns a ProductSpecification promise', async () => {
    const adapter: ICatalogAdapter = new StubCatalogAdapter();
    const result = await adapter.getProductSpecification('ps-001');
    expect(result).toBeDefined();
    expect(typeof result.id).toBe('string');
  });

  it('ICatalogAdapter.listProductOfferings returns an array', async () => {
    const adapter: ICatalogAdapter = new StubCatalogAdapter();
    const result = await adapter.listProductOfferings();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── AC-5  JSDoc references TMF620 ──────────────────────────────────────────

describe('TMF620 — adapter JSDoc references Open API number', () => {
  it('ICatalogAdapter.ts contains a reference to TMF620', () => {
    const content = fs.readFileSync(CATALOG_ADAPTER_FILE, 'utf-8');
    expect(content).toMatch(/TMF620|TMF-620|620/);
  });

  it('ICatalogAdapter.ts contains a reference to ProductOffering or ProductCatalog', () => {
    const content = fs.readFileSync(CATALOG_ADAPTER_FILE, 'utf-8');
    expect(content).toMatch(/ProductOffering|ProductCatalog/);
  });
});

// ─── AC-6  Zero runtime dependencies ────────────────────────────────────────

describe('TMF620 — zero runtime dependencies', () => {
  it('tmf620.ts module has no runtime value exports (pure type file)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../integration/types/tmf620') as Record<string, unknown>;
    // Interfaces and type aliases produce no runtime values; only const-enum or enum members would
    const runtimeValueExports = Object.keys(mod).filter(
      (k) => typeof mod[k] !== 'undefined',
    );
    // A pure type file emits an empty module — zero runtime exports expected
    expect(runtimeValueExports).toHaveLength(0);
  });
});
