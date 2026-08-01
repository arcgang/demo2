/**
 * IPartyAdapter — boundary contract for TMF632 Party Management.
 *
 * Aligns with TM Forum Open API TMF632 (Party Management API).
 * Exposes Individual, Organization, and PartyRole resource operations used
 * by the CustomerIdentityModule to resolve party and customer profile data.
 */

import type { Individual, Organization, PartyRole } from '../types/tmf632';

export interface IPartyAdapter {
  /** Retrieve an Individual party resource by its TMF632 id. */
  getIndividual(id: string): Promise<Individual>;

  /** Retrieve an Organization party resource by its TMF632 id. */
  getOrganization(id: string): Promise<Organization>;

  /** List all PartyRoles associated with a given party id. */
  listPartyRoles(partyId: string): Promise<PartyRole[]>;
}
