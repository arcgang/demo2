export interface MarketSeed {
  id: string;
  code: string;
  name: string;
  currency: string;
  taxRate: number;
  taxLabel: string;
  defaultLanguage: string;
}

export interface PlanSeed {
  id: string;
  name: string;
  dataAllowance?: string;
  monthlyPrice: number;
  currency: string;
}

export interface ProductSeed {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  imageUrl?: string;
  badges: string[];
  plans: PlanSeed[];
  recommendedAccessories: AccessorySeed[];
}

export interface ProductMarketSeed {
  productId: string;
  marketId: string;
  price: number;
  available: boolean;
  purchasable: boolean;
}

export interface AccessorySeed {
  id: string;
  name: string;
}

export const MARKETS: MarketSeed[] = [
  {
    id: 'market_ZA',
    code: 'ZA',
    name: 'South Africa',
    currency: 'ZAR',
    taxRate: 0.15,
    taxLabel: 'VAT',
    defaultLanguage: 'en-ZA',
  },
];

const SHARED_PLANS: PlanSeed[] = [
  { id: 'plan_red_5gb', name: 'Red 5GB', dataAllowance: '5GB', monthlyPrice: 299, currency: 'ZAR' },
  { id: 'plan_unlimited_20gb', name: 'Unlimited 20GB', dataAllowance: '20GB', monthlyPrice: 799, currency: 'ZAR' },
  { id: 'plan_red_premium', name: 'Red Premium', dataAllowance: 'Unlimited', monthlyPrice: 299, currency: 'ZAR' },
];

const SHARED_ACCESSORIES: AccessorySeed[] = [
  { id: 'acc_case', name: 'Protective Case' },
  { id: 'acc_charger', name: 'Fast Charger' },
  { id: 'acc_screen', name: 'Screen Protector' },
];

export const PRODUCTS: ProductSeed[] = [
  {
    id: 'prod_samsung_s24_ultra',
    name: 'Samsung Galaxy S24 Ultra',
    category: 'smartphones',
    basePrice: 29999,
    imageUrl: '/images/samsung-s24-ultra.jpg',
    badges: ['5G', 'Trade-In'],
    plans: SHARED_PLANS,
    recommendedAccessories: SHARED_ACCESSORIES,
  },
  {
    id: 'prod_iphone_15_pro',
    name: 'iPhone 15 Pro',
    category: 'smartphones',
    basePrice: 27999,
    imageUrl: '/images/iphone-15-pro.jpg',
    badges: ['5G', 'Trade-In'],
    plans: SHARED_PLANS,
    recommendedAccessories: SHARED_ACCESSORIES,
  },
  {
    id: 'prod_samsung_s24',
    name: 'Samsung Galaxy S24',
    category: 'smartphones',
    basePrice: 19999,
    imageUrl: '/images/samsung-s24.jpg',
    badges: ['5G'],
    plans: SHARED_PLANS,
    recommendedAccessories: SHARED_ACCESSORIES,
  },
  {
    id: 'prod_iphone_15',
    name: 'iPhone 15',
    category: 'smartphones',
    basePrice: 18999,
    imageUrl: '/images/iphone-15.jpg',
    badges: ['5G', 'Trade-In'],
    plans: SHARED_PLANS,
    recommendedAccessories: SHARED_ACCESSORIES,
  },
  {
    id: 'prod_pixel_8_pro',
    name: 'Google Pixel 8 Pro',
    category: 'smartphones',
    basePrice: 16999,
    imageUrl: '/images/pixel-8-pro.jpg',
    badges: ['5G'],
    plans: SHARED_PLANS,
    recommendedAccessories: SHARED_ACCESSORIES,
  },
  {
    id: 'prod_samsung_a55',
    name: 'Samsung Galaxy A55',
    category: 'smartphones',
    basePrice: 8999,
    imageUrl: '/images/samsung-a55.jpg',
    badges: ['5G'],
    plans: SHARED_PLANS,
    recommendedAccessories: SHARED_ACCESSORIES,
  },
  {
    id: 'prod_nokia_g42',
    name: 'Nokia G42',
    category: 'smartphones',
    basePrice: 4999,
    imageUrl: '/images/nokia-g42.jpg',
    badges: [],
    plans: SHARED_PLANS,
    recommendedAccessories: SHARED_ACCESSORIES,
  },
];

// prod_nokia_g42 is seeded as unavailable to exercise the availability-filter code path.
export const PRODUCT_MARKETS: ProductMarketSeed[] = [
  ...PRODUCTS.slice(0, 6).map((p) => ({
    productId: p.id,
    marketId: 'market_ZA',
    price: p.basePrice,
    available: true,
    purchasable: true,
  })),
  {
    productId: 'prod_nokia_g42',
    marketId: 'market_ZA',
    price: 4999,
    available: false,
    purchasable: false,
  },
];
