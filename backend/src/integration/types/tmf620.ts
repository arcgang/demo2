/** TMF620 Product Catalog Management — resource type definitions. */

export interface ProductSpecification {
  id: string;
  name?: string;
  description?: string;
  version?: string;
}

export interface ProductOfferingPrice {
  id: string;
  name?: string;
  description?: string;
  priceType?: string;
  price?: { taxIncludedAmount?: number; dutyFreeAmount?: number; unit?: string };
}

export interface BundledProductOffering {
  id: string;
  href?: string;
  name?: string;
}

export interface ProductOffering {
  id: string;
  name?: string;
  description?: string;
  isBundle?: boolean;
  lifecycleStatus?: string;
  productSpecification?: ProductSpecification;
  productOfferingPrice?: ProductOfferingPrice[];
  bundledProductOffering?: BundledProductOffering[];
}
