/**
 * IOrderingAdapter — boundary contract for TMF622 Product Ordering Management.
 *
 * Aligns with TM Forum Open API TMF622 (Product Ordering Management API).
 * Exposes ProductOrder resource operations used by the OrderModule to submit
 * and retrieve orders against the ordering boundary.
 */

import type { ProductOrder } from '../types/tmf622';

export interface IOrderingAdapter {
  /** Submit a new ProductOrder to the TMF622 ordering boundary. */
  createProductOrder(order: ProductOrder): Promise<ProductOrder>;

  /** Retrieve an existing ProductOrder by its TMF622 id. */
  getProductOrder(id: string): Promise<ProductOrder>;
}
