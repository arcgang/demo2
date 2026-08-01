/**
 * IAccountAdapter — boundary contract for TMF666 Account Management.
 *
 * Aligns with TM Forum Open API TMF666 (Account Management API).
 * Exposes BillingAccount and AccountBalance resource operations used by the
 * CustomerIdentityModule and EligibilityModule to resolve account context
 * for existing customers on upgrade journeys.
 */

import type { BillingAccount, AccountBalance } from '../types/tmf666';

export interface IAccountAdapter {
  /** Retrieve a BillingAccount resource by its TMF666 id. */
  getBillingAccount(id: string): Promise<BillingAccount>;

  /** List all AccountBalance entries for a given billing account id. */
  getAccountBalance(accountId: string): Promise<AccountBalance[]>;
}
