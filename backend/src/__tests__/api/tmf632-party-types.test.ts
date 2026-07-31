/**
 * Acceptance tests for TMF632 resource types and IPartyAdapter.
 *
 * Acceptance criteria:
 *   AC-1  src/integration/types/tmf632.ts exports Individual, Organization,
 *         PartyRole, RelatedParty.
 *   AC-2  src/integration/adapters/IPartyAdapter.ts exports IPartyAdapter.
 *   AC-3  Types use TMF632 attribute names (no bespoke aliases).
 *   AC-4  IPartyAdapter method signatures use only TMF632 resource types.
 *   AC-5  IPartyAdapter file contains inline JSDoc referencing TMF632.
 *   AC-6  Type file has zero runtime dependencies.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '../..');
const TMF632_TYPES_FILE  = path.join(SRC_ROOT, 'integration', 'types', 'tmf632.ts');
const PARTY_ADAPTER_FILE = path.join(SRC_ROOT, 'integration', 'adapters', 'IPartyAdapter.ts');

// ─── AC-1 / AC-2  File existence ────────────────────────────────────────────

describe('TMF632 — file existence', () => {
  it('src/integration/types/tmf632.ts exists', () => {
    expect(fs.existsSync(TMF632_TYPES_FILE)).toBe(true);
  });

  it('src/integration/adapters/IPartyAdapter.ts exists', () => {
    expect(fs.existsSync(PARTY_ADAPTER_FILE)).toBe(true);
  });
});

// ─── AC-3  TMF632 attribute naming ──────────────────────────────────────────

import type {
  Individual,
  Organization,
  PartyRole,
  RelatedParty,
} from '../../integration/types/tmf632';

describe('TMF632 — Individual attribute names', () => {
  it('Individual has a string id field', () => {
    const ind: Individual = { id: 'ind-001' };
    expect(typeof ind.id).toBe('string');
  });

  it('Individual uses givenName (not firstName)', () => {
    const ind: Individual = { id: 'ind-002', givenName: 'Amina' };
    expect(Object.prototype.hasOwnProperty.call(ind, 'givenName')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(ind, 'firstName')).toBe(false);
  });

  it('Individual uses familyName (not lastName or surname)', () => {
    const ind: Individual = { id: 'ind-003', familyName: 'Dlamini' };
    expect(Object.prototype.hasOwnProperty.call(ind, 'familyName')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(ind, 'lastName')).toBe(false);
  });
});

describe('TMF632 — Organization attribute names', () => {
  it('Organization has a string id field', () => {
    const org: Organization = { id: 'org-001' };
    expect(typeof org.id).toBe('string');
  });

  it('Organization uses tradingName (not companyName)', () => {
    const org: Organization = { id: 'org-002', tradingName: 'Vodacom' };
    expect(Object.prototype.hasOwnProperty.call(org, 'tradingName')).toBe(true);
  });
});

describe('TMF632 — PartyRole attribute names', () => {
  it('PartyRole has a string id field', () => {
    const role: PartyRole = { id: 'pr-001', name: 'Customer' };
    expect(typeof role.id).toBe('string');
  });

  it('PartyRole has a name field', () => {
    const role: PartyRole = { id: 'pr-002', name: 'Seller' };
    expect(typeof role.name).toBe('string');
  });
});

describe('TMF632 — RelatedParty attribute names', () => {
  it('RelatedParty has an id field', () => {
    const rp: RelatedParty = { id: 'rp-001', role: 'Customer' };
    expect(typeof rp.id).toBe('string');
  });

  it('RelatedParty uses role (not partyRole or roleType)', () => {
    const rp: RelatedParty = { id: 'rp-002', role: 'Seller' };
    expect(Object.prototype.hasOwnProperty.call(rp, 'role')).toBe(true);
  });
});

// ─── AC-4  IPartyAdapter method signatures ──────────────────────────────────

import type { IPartyAdapter } from '../../integration/adapters/IPartyAdapter';

class StubPartyAdapter implements IPartyAdapter {
  async getIndividual(id: string): Promise<Individual> {
    return { id };
  }

  async getOrganization(id: string): Promise<Organization> {
    return { id };
  }

  async listPartyRoles(partyId: string): Promise<PartyRole[]> {
    void partyId;
    return [];
  }
}

describe('TMF632 — IPartyAdapter interface', () => {
  it('IPartyAdapter can be implemented with TMF632 types', () => {
    const adapter: IPartyAdapter = new StubPartyAdapter();
    expect(adapter).toBeDefined();
  });

  it('IPartyAdapter.getIndividual returns an Individual promise', async () => {
    const adapter: IPartyAdapter = new StubPartyAdapter();
    const result = await adapter.getIndividual('ind-001');
    expect(result).toBeDefined();
    expect(typeof result.id).toBe('string');
  });

  it('IPartyAdapter.getOrganization returns an Organization promise', async () => {
    const adapter: IPartyAdapter = new StubPartyAdapter();
    const result = await adapter.getOrganization('org-001');
    expect(result).toBeDefined();
    expect(typeof result.id).toBe('string');
  });

  it('IPartyAdapter.listPartyRoles returns an array', async () => {
    const adapter: IPartyAdapter = new StubPartyAdapter();
    const result = await adapter.listPartyRoles('ind-001');
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── AC-5  JSDoc references TMF632 ──────────────────────────────────────────

describe('TMF632 — adapter JSDoc references Open API number', () => {
  it('IPartyAdapter.ts contains a reference to TMF632', () => {
    const content = fs.readFileSync(PARTY_ADAPTER_FILE, 'utf-8');
    expect(content).toMatch(/TMF632|TMF-632|632/);
  });

  it('IPartyAdapter.ts references Individual or Party', () => {
    const content = fs.readFileSync(PARTY_ADAPTER_FILE, 'utf-8');
    expect(content).toMatch(/Individual|Party/);
  });
});

// ─── AC-6  Zero runtime dependencies ────────────────────────────────────────

describe('TMF632 — zero runtime dependencies', () => {
  it('tmf632.ts module has no runtime value exports', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../integration/types/tmf632') as Record<string, unknown>;
    const runtimeValueExports = Object.keys(mod).filter(
      (k) => typeof mod[k] !== 'undefined',
    );
    expect(runtimeValueExports).toHaveLength(0);
  });
});
