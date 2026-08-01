/**
 * Acceptance tests for TMF666 resource types and IAccountAdapter.
 *
 * Acceptance criteria:
 *   AC-1  src/integration/types/tmf666.ts exports BillingAccount, AccountBalance, AccountRef.
 *   AC-2  src/integration/adapters/IAccountAdapter.ts exports IAccountAdapter.
 *   AC-3  Types use TMF666 attribute names (no bespoke aliases).
 *   AC-4  IAccountAdapter method signatures use only TMF666 resource types.
 *   AC-5  IAccountAdapter file contains inline JSDoc referencing TMF666.
 *   AC-6  Type file has zero runtime dependencies.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '../..');
const TMF666_TYPES_FILE    = path.join(SRC_ROOT, 'integration', 'types', 'tmf666.ts');
const ACCOUNT_ADAPTER_FILE = path.join(SRC_ROOT, 'integration', 'adapters', 'IAccountAdapter.ts');

// ─── AC-1 / AC-2  File existence ────────────────────────────────────────────

describe('TMF666 — file existence', () => {
  it('src/integration/types/tmf666.ts exists', () => {
    expect(fs.existsSync(TMF666_TYPES_FILE)).toBe(true);
  });

  it('src/integration/adapters/IAccountAdapter.ts exists', () => {
    expect(fs.existsSync(ACCOUNT_ADAPTER_FILE)).toBe(true);
  });
});

// ─── AC-3  TMF666 attribute naming ──────────────────────────────────────────

import type {
  BillingAccount,
  AccountBalance,
  AccountRef,
} from '../../integration/types/tmf666';

describe('TMF666 — BillingAccount attribute names', () => {
  it('BillingAccount has a string id field', () => {
    const account: BillingAccount = { id: 'ba-001' };
    expect(typeof account.id).toBe('string');
  });

  it('BillingAccount uses accountBalance (not balance or currentBalance)', () => {
    const balance: AccountBalance = { amount: 0, unit: 'ZAR' };
    const account: BillingAccount = { id: 'ba-002', accountBalance: [balance] };
    expect(Object.prototype.hasOwnProperty.call(account, 'accountBalance')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(account, 'balance')).toBe(false);
  });

  it('BillingAccount uses name (not accountName)', () => {
    const account: BillingAccount = { id: 'ba-003', name: 'Amina Dlamini' };
    expect(Object.prototype.hasOwnProperty.call(account, 'name')).toBe(true);
  });
});

describe('TMF666 — AccountBalance attribute names', () => {
  it('AccountBalance has amount and unit fields', () => {
    const balance: AccountBalance = { amount: 150.0, unit: 'ZAR' };
    expect(typeof balance.amount).toBe('number');
    expect(typeof balance.unit).toBe('string');
  });

  it('AccountBalance uses amount (not value or balanceAmount)', () => {
    const balance: AccountBalance = { amount: 200.0, unit: 'TZS' };
    expect(Object.prototype.hasOwnProperty.call(balance, 'amount')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(balance, 'value')).toBe(false);
  });
});

describe('TMF666 — AccountRef attribute names', () => {
  it('AccountRef has an id field', () => {
    const ref: AccountRef = { id: 'ba-001' };
    expect(typeof ref.id).toBe('string');
  });

  it('AccountRef uses href as the resource link (not url or link)', () => {
    const ref: AccountRef = { id: 'ba-002', href: '/billingAccounts/ba-002' };
    expect(Object.prototype.hasOwnProperty.call(ref, 'href')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(ref, 'url')).toBe(false);
  });
});

// ─── AC-4  IAccountAdapter method signatures ────────────────────────────────

import type { IAccountAdapter } from '../../integration/adapters/IAccountAdapter';

class StubAccountAdapter implements IAccountAdapter {
  async getBillingAccount(id: string): Promise<BillingAccount> {
    return { id };
  }

  async getAccountBalance(accountId: string): Promise<AccountBalance[]> {
    void accountId;
    return [{ amount: 0, unit: 'ZAR' }];
  }
}

describe('TMF666 — IAccountAdapter interface', () => {
  it('IAccountAdapter can be implemented with TMF666 types', () => {
    const adapter: IAccountAdapter = new StubAccountAdapter();
    expect(adapter).toBeDefined();
  });

  it('IAccountAdapter.getBillingAccount returns a BillingAccount promise', async () => {
    const adapter: IAccountAdapter = new StubAccountAdapter();
    const result = await adapter.getBillingAccount('ba-001');
    expect(result).toBeDefined();
    expect(typeof result.id).toBe('string');
  });

  it('IAccountAdapter.getAccountBalance returns an AccountBalance array promise', async () => {
    const adapter: IAccountAdapter = new StubAccountAdapter();
    const result = await adapter.getAccountBalance('ba-001');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(typeof result[0].amount).toBe('number');
  });
});

// ─── AC-5  JSDoc references TMF666 ──────────────────────────────────────────

describe('TMF666 — adapter JSDoc references Open API number', () => {
  it('IAccountAdapter.ts contains a reference to TMF666', () => {
    const content = fs.readFileSync(ACCOUNT_ADAPTER_FILE, 'utf-8');
    expect(content).toMatch(/TMF666|TMF-666|666/);
  });

  it('IAccountAdapter.ts references BillingAccount or AccountManagement', () => {
    const content = fs.readFileSync(ACCOUNT_ADAPTER_FILE, 'utf-8');
    expect(content).toMatch(/BillingAccount|AccountManagement/);
  });
});

// ─── AC-6  Zero runtime dependencies ────────────────────────────────────────

describe('TMF666 — zero runtime dependencies', () => {
  it('tmf666.ts module has no runtime value exports', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../integration/types/tmf666') as Record<string, unknown>;
    const runtimeValueExports = Object.keys(mod).filter(
      (k) => typeof mod[k] !== 'undefined',
    );
    expect(runtimeValueExports).toHaveLength(0);
  });
});
