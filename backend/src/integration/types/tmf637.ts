/** TMF637 Product Inventory Management — resource type definitions. */

export interface ProductInventory {
  id: string;
  href?: string;
  status?: string;
  productSerialNumber?: string;
  startDate?: string;
  terminationDate?: string;
}

export interface CheckProductStockRequest {
  productId: string;
  requestedQuantity?: number;
  marketCode?: string;
}

export interface CheckProductStockResponse {
  productId: string;
  availableQuantity: number;
  status?: string;
  reservedQuantity?: number;
}
