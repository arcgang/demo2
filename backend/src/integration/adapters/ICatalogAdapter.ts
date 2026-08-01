/**
 * ICatalogAdapter — boundary contract for TMF620 Product Catalog Management.
 *
 * Aligns with TM Forum Open API TMF620 (Product Catalog Management API).
 * Exposes ProductOffering and ProductSpecification resource operations used
 * by the CatalogModule to retrieve and list product catalog data.
 */

import type {
  ProductOffering,
  ProductSpecification,
} from '../types/tmf620';

export interface ICatalogAdapter {
  /** Retrieve a single ProductOffering by its TMF620 id. */
  getProductOffering(id: string): Promise<ProductOffering>;

  /** Retrieve a single ProductSpecification by its TMF620 id. */
  getProductSpecification(id: string): Promise<ProductSpecification>;

  /** List ProductOfferings, optionally filtered by partial attribute match. */
  listProductOfferings(filter?: Partial<ProductOffering>): Promise<ProductOffering[]>;
}
