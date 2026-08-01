/** TMF622 Product Ordering Management — resource type definitions. */

export type ProductOrderStateType =
  | 'acknowledged'
  | 'rejected'
  | 'pending'
  | 'held'
  | 'inProgress'
  | 'cancelled'
  | 'completed'
  | 'failed'
  | 'partial';

export interface OrderItemRelationship {
  id: string;
  relationshipType: string;
}

export interface ProductOrderItem {
  id: string;
  action?: string;
  quantity?: number;
  state?: ProductOrderStateType;
  orderItemRelationship?: OrderItemRelationship[];
}

export interface ProductOrder {
  id: string;
  state: ProductOrderStateType;
  productOrderItem: ProductOrderItem[];
  externalId?: string;
  priority?: string;
  requestedStartDate?: string;
  requestedCompletionDate?: string;
}

/** Lightweight reference to a ProductOrder resource, used in TMF669 event payloads. */
export interface ProductOrderRef {
  id: string;
  href?: string;
}
