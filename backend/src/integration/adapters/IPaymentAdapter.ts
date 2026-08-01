/**
 * IPaymentAdapter — boundary contract for TMF676 Payment Management.
 *
 * Aligns with TM Forum Open API TMF676 (Payment Management API).
 * Exposes PaymentMeans resource operations used by the PaymentModule to
 * initiate and retrieve payment records against the payment management boundary.
 */

import type { PaymentMeans } from '../types/tmf676';

export interface IPaymentAdapter {
  /** Create a new PaymentMeans resource on the TMF676 payment boundary. */
  createPaymentMeans(means: PaymentMeans): Promise<PaymentMeans>;

  /** Retrieve a PaymentMeans resource by its TMF676 id. */
  getPaymentMeans(id: string): Promise<PaymentMeans>;

  /** List PaymentMeans resources, optionally filtered by partial attribute match. */
  listPaymentMeans(filter?: Partial<PaymentMeans>): Promise<PaymentMeans[]>;
}
