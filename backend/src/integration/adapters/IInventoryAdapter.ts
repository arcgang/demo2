/**
 * IInventoryAdapter — boundary contract for TMF637 Product Inventory Management.
 *
 * Aligns with TM Forum Open API TMF637 (Product Inventory Management API).
 * Exposes ProductInventory and stock-check operations used by the
 * EligibilityModule to verify product availability before order placement.
 */

import type {
  ProductInventory,
  CheckProductStockRequest,
  CheckProductStockResponse,
} from '../types/tmf637';

export interface IInventoryAdapter {
  /** Retrieve a ProductInventory resource by its TMF637 id. */
  getProductInventory(id: string): Promise<ProductInventory>;

  /** Check available stock for a product using the TMF637 stock-check contract. */
  checkProductStock(request: CheckProductStockRequest): Promise<CheckProductStockResponse>;
}
