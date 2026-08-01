/**
 * Acceptance tests for TMF676 resource types and IPaymentAdapter.
 *
 * Acceptance criteria:
 *   AC-1  src/integration/types/tmf676.ts exports PaymentMeans, PaymentRef,
 *         PaymentMethodType.
 *   AC-2  src/integration/adapters/IPaymentAdapter.ts exports IPaymentAdapter.
 *   AC-3  Types use TMF676 attribute names (no bespoke aliases).
 *   AC-4  IPaymentAdapter method signatures use only TMF676 resource types.
 *   AC-5  IPaymentAdapter file contains inline JSDoc referencing TMF676.
 *   AC-6  Type file has zero runtime dependencies.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '../..');
const TMF676_TYPES_FILE    = path.join(SRC_ROOT, 'integration', 'types', 'tmf676.ts');
const PAYMENT_ADAPTER_FILE = path.join(SRC_ROOT, 'integration', 'adapters', 'IPaymentAdapter.ts');

// ─── AC-1 / AC-2  File existence ────────────────────────────────────────────

describe('TMF676 — file existence', () => {
  it('src/integration/types/tmf676.ts exists', () => {
    expect(fs.existsSync(TMF676_TYPES_FILE)).toBe(true);
  });

  it('src/integration/adapters/IPaymentAdapter.ts exists', () => {
    expect(fs.existsSync(PAYMENT_ADAPTER_FILE)).toBe(true);
  });
});

// ─── AC-3  TMF676 attribute naming ──────────────────────────────────────────

import type {
  PaymentMeans,
  PaymentRef,
  PaymentMethodType,
} from '../../integration/types/tmf676';

describe('TMF676 — PaymentMeans attribute names', () => {
  it('PaymentMeans has a string id field', () => {
    const means: PaymentMeans = { id: 'pm-001' };
    expect(typeof means.id).toBe('string');
  });

  it('PaymentMeans uses paymentMethodType (not methodType or type)', () => {
    const means: PaymentMeans = { id: 'pm-002', paymentMethodType: 'tokenizedCard' };
    expect(Object.prototype.hasOwnProperty.call(means, 'paymentMethodType')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(means, 'methodType')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(means, 'type')).toBe(false);
  });

  it('PaymentMeans uses totalAmount (not amount or totalCost)', () => {
    const means: PaymentMeans = {
      id: 'pm-003',
      totalAmount: { amount: 18999.0, unit: 'ZAR' },
    };
    expect(Object.prototype.hasOwnProperty.call(means, 'totalAmount')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(means, 'amount')).toBe(false);
  });
});

describe('TMF676 — PaymentRef attribute names', () => {
  it('PaymentRef has an id field', () => {
    const ref: PaymentRef = { id: 'pay-001' };
    expect(typeof ref.id).toBe('string');
  });

  it('PaymentRef uses href as the resource link (not url)', () => {
    const ref: PaymentRef = { id: 'pay-002', href: '/payments/pay-002' };
    expect(Object.prototype.hasOwnProperty.call(ref, 'href')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(ref, 'url')).toBe(false);
  });
});

describe('TMF676 — PaymentMethodType values', () => {
  it("'tokenizedCard' is a valid PaymentMethodType", () => {
    const t: PaymentMethodType = 'tokenizedCard';
    expect(t).toBe('tokenizedCard');
  });

  it("'digitalWallet' is a valid PaymentMethodType", () => {
    const t: PaymentMethodType = 'digitalWallet';
    expect(t).toBe('digitalWallet');
  });

  it("'voucher' is a valid PaymentMethodType", () => {
    const t: PaymentMethodType = 'voucher';
    expect(t).toBe('voucher');
  });
});

// ─── AC-4  IPaymentAdapter method signatures ────────────────────────────────

import type { IPaymentAdapter } from '../../integration/adapters/IPaymentAdapter';

class StubPaymentAdapter implements IPaymentAdapter {
  async createPaymentMeans(means: PaymentMeans): Promise<PaymentMeans> {
    return { ...means, id: 'pm-created' };
  }

  async getPaymentMeans(id: string): Promise<PaymentMeans> {
    return { id };
  }

  async listPaymentMeans(filter?: Partial<PaymentMeans>): Promise<PaymentMeans[]> {
    void filter;
    return [];
  }
}

describe('TMF676 — IPaymentAdapter interface', () => {
  it('IPaymentAdapter can be implemented with TMF676 types', () => {
    const adapter: IPaymentAdapter = new StubPaymentAdapter();
    expect(adapter).toBeDefined();
  });

  it('IPaymentAdapter.createPaymentMeans returns a PaymentMeans promise', async () => {
    const adapter: IPaymentAdapter = new StubPaymentAdapter();
    const result = await adapter.createPaymentMeans({ id: '' });
    expect(result).toBeDefined();
    expect(typeof result.id).toBe('string');
  });

  it('IPaymentAdapter.getPaymentMeans returns a PaymentMeans promise', async () => {
    const adapter: IPaymentAdapter = new StubPaymentAdapter();
    const result = await adapter.getPaymentMeans('pm-001');
    expect(result).toBeDefined();
    expect(result.id).toBe('pm-001');
  });

  it('IPaymentAdapter.listPaymentMeans returns an array', async () => {
    const adapter: IPaymentAdapter = new StubPaymentAdapter();
    const result = await adapter.listPaymentMeans();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── AC-5  JSDoc references TMF676 ──────────────────────────────────────────

describe('TMF676 — adapter JSDoc references Open API number', () => {
  it('IPaymentAdapter.ts contains a reference to TMF676', () => {
    const content = fs.readFileSync(PAYMENT_ADAPTER_FILE, 'utf-8');
    expect(content).toMatch(/TMF676|TMF-676|676/);
  });

  it('IPaymentAdapter.ts references PaymentMeans or PaymentManagement', () => {
    const content = fs.readFileSync(PAYMENT_ADAPTER_FILE, 'utf-8');
    expect(content).toMatch(/PaymentMeans|PaymentManagement/);
  });
});

// ─── AC-6  Zero runtime dependencies ────────────────────────────────────────

describe('TMF676 — zero runtime dependencies', () => {
  it('tmf676.ts module has no runtime value exports', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../integration/types/tmf676') as Record<string, unknown>;
    const runtimeValueExports = Object.keys(mod).filter(
      (k) => typeof mod[k] !== 'undefined',
    );
    expect(runtimeValueExports).toHaveLength(0);
  });
});
