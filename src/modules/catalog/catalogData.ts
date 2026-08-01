export interface StorefrontProduct {
  productId: string;
  slug: string;
  name: string;
  price: number;
  monthlyFrom: number;
  badges: string[];
  brand: string;
  storage: string;
  availability: 'In Stock' | 'Pre-Order';
  isPurchasable: boolean;
  subcategory: string;
}

// ZA market products matching GET /api/catalog/products?market=ZA
// isPurchasable reflects whether standard ZA payment methods satisfy the product requirement.
// WALLET_PREMIUM is not in the ZA payment methods, so that device is isPurchasable=false.
export const ZA_STOREFRONT_PRODUCTS: StorefrontProduct[] = [
  {
    productId: 'prod_za_iphone15pro_256',
    slug: 'iphone-15-pro',
    name: 'iPhone 15 Pro 256GB',
    price: 24999,
    monthlyFrom: 899,
    badges: ['5G', 'Trade-In'],
    brand: 'Apple',
    storage: '256GB',
    availability: 'In Stock',
    isPurchasable: true,
    subcategory: 'smartphones',
  },
  {
    productId: 'prod_za_samsung_s24ultra_256',
    slug: 'samsung-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra 256GB',
    price: 22999,
    monthlyFrom: 799,
    badges: ['5G'],
    brand: 'Samsung',
    storage: '256GB',
    availability: 'In Stock',
    isPurchasable: true,
    subcategory: 'smartphones',
  },
  {
    productId: 'prod_za_iphone15_128',
    slug: 'iphone-15',
    name: 'iPhone 15 128GB',
    price: 18999,
    monthlyFrom: 699,
    badges: ['5G', 'Trade-In'],
    brand: 'Apple',
    storage: '128GB',
    availability: 'In Stock',
    isPurchasable: true,
    subcategory: 'smartphones',
  },
  {
    productId: 'prod_za_samsung_s24_256',
    slug: 'samsung-s24',
    name: 'Samsung Galaxy S24 256GB',
    price: 16999,
    monthlyFrom: 599,
    badges: ['5G'],
    brand: 'Samsung',
    storage: '256GB',
    availability: 'In Stock',
    isPurchasable: true,
    subcategory: 'smartphones',
  },
  {
    productId: 'prod_za_samsung_a54_128',
    slug: 'samsung-a54',
    name: 'Samsung Galaxy A54 128GB',
    price: 8999,
    monthlyFrom: 349,
    badges: ['5G'],
    brand: 'Samsung',
    storage: '128GB',
    availability: 'In Stock',
    isPurchasable: true,
    subcategory: 'smartphones',
  },
  {
    productId: 'prod_za_iphone14_128',
    slug: 'iphone-14',
    name: 'iPhone 14 128GB',
    price: 15999,
    monthlyFrom: 579,
    badges: ['5G', 'Trade-In'],
    brand: 'Apple',
    storage: '128GB',
    availability: 'In Stock',
    isPurchasable: false,
    subcategory: 'smartphones',
  },
];

const SUBCATEGORY_MAP: Record<string, string> = {
  smartphones: 'smartphones',
  tablets: 'tablets',
  'sim-esim': 'sim-esim',
  accessories: 'accessories',
};

export function getProductsForStorefront(category?: string): StorefrontProduct[] {
  if (!category) return ZA_STOREFRONT_PRODUCTS;
  const subcategory = SUBCATEGORY_MAP[category.toLowerCase()];
  if (!subcategory) return [];
  return ZA_STOREFRONT_PRODUCTS.filter(p => p.subcategory === subcategory);
}
