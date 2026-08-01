export interface ProductSeed {
  productId: string;
  productType: 'DEVICE' | 'PLAN' | 'BUNDLE' | 'SIM' | 'ESIM' | 'ACCESSORY';
  name: string;
  marketCode: string;
  priceOnceOff: number;
  priceRecurring: number;
  availabilityStatus: string;
  badges: string[];
  compatiblePlanIds: string[];
  onboardingRequirements: string[];
  requiresPaymentMethod?: string;
  metadata: Record<string, unknown>;
}

// ─── ZA Plan options (referenced by devices as compatibleOffers) ──────────────

export const ZA_PLANS: ProductSeed[] = [
  {
    productId: 'plan_za_red_essential_20gb',
    productType: 'PLAN',
    name: 'Red Essential 20GB',
    marketCode: 'ZA',
    priceOnceOff: 0,
    priceRecurring: 599,
    availabilityStatus: 'AVAILABLE',
    badges: ['5G', '20GB Data'],
    compatiblePlanIds: [],
    onboardingRequirements: [],
    metadata: { dataGb: 20, minutes: 'Unlimited', sms: 'Unlimited' },
  },
  {
    productId: 'plan_za_red_premium_50gb',
    productType: 'PLAN',
    name: 'Red Premium 50GB',
    marketCode: 'ZA',
    priceOnceOff: 0,
    priceRecurring: 899,
    availabilityStatus: 'AVAILABLE',
    badges: ['5G', '50GB Data'],
    compatiblePlanIds: [],
    onboardingRequirements: [],
    metadata: { dataGb: 50, minutes: 'Unlimited', sms: 'Unlimited' },
  },
  {
    productId: 'plan_za_unlimited_max',
    productType: 'PLAN',
    name: 'Unlimited Max',
    marketCode: 'ZA',
    priceOnceOff: 0,
    priceRecurring: 1299,
    availabilityStatus: 'AVAILABLE',
    badges: ['5G', 'Unlimited Data', 'Roaming'],
    compatiblePlanIds: [],
    onboardingRequirements: [],
    metadata: { dataGb: -1, minutes: 'Unlimited', sms: 'Unlimited', roaming: true },
  },
];

const ZA_PLAN_IDS = ZA_PLANS.map(p => p.productId);

// ─── ZA Device SKUs (six smartphones from wireframe_product_listing.html) ─────

export const ZA_DEVICES: ProductSeed[] = [
  {
    productId: 'prod_za_iphone15pro_256',
    productType: 'DEVICE',
    name: 'iPhone 15 Pro 256GB',
    marketCode: 'ZA',
    priceOnceOff: 24999,
    priceRecurring: 0,
    availabilityStatus: 'AVAILABLE',
    badges: ['5G', 'Trade-In Eligible'],
    compatiblePlanIds: ZA_PLAN_IDS,
    onboardingRequirements: ['SIM_OR_ESIM_SELECTION'],
    metadata: { brand: 'Apple', storage: '256GB', colour: 'Natural Titanium', simType: 'ESIM', subcategory: 'smartphones' },
  },
  {
    productId: 'prod_za_samsung_s24ultra_256',
    productType: 'DEVICE',
    name: 'Samsung Galaxy S24 Ultra 256GB',
    marketCode: 'ZA',
    priceOnceOff: 22999,
    priceRecurring: 0,
    availabilityStatus: 'AVAILABLE',
    badges: ['5G'],
    compatiblePlanIds: ZA_PLAN_IDS,
    onboardingRequirements: ['SIM_OR_ESIM_SELECTION'],
    metadata: { brand: 'Samsung', storage: '256GB', colour: 'Phantom Black', simType: 'NANO_SIM', subcategory: 'smartphones' },
  },
  {
    productId: 'prod_za_iphone15_128',
    productType: 'DEVICE',
    name: 'iPhone 15 128GB',
    marketCode: 'ZA',
    priceOnceOff: 18999,
    priceRecurring: 0,
    availabilityStatus: 'AVAILABLE',
    badges: ['5G', 'Trade-In Eligible'],
    compatiblePlanIds: ZA_PLAN_IDS,
    onboardingRequirements: ['SIM_OR_ESIM_SELECTION'],
    metadata: { brand: 'Apple', storage: '128GB', colour: 'Pink', simType: 'ESIM', subcategory: 'smartphones' },
  },
  {
    productId: 'prod_za_samsung_s24_256',
    productType: 'DEVICE',
    name: 'Samsung Galaxy S24 256GB',
    marketCode: 'ZA',
    priceOnceOff: 16999,
    priceRecurring: 0,
    availabilityStatus: 'AVAILABLE',
    badges: ['5G'],
    compatiblePlanIds: ZA_PLAN_IDS,
    onboardingRequirements: ['SIM_OR_ESIM_SELECTION'],
    metadata: { brand: 'Samsung', storage: '256GB', colour: 'Violet', simType: 'NANO_SIM', subcategory: 'smartphones' },
  },
  {
    productId: 'prod_za_samsung_a54_128',
    productType: 'DEVICE',
    name: 'Samsung Galaxy A54 128GB',
    marketCode: 'ZA',
    priceOnceOff: 8999,
    priceRecurring: 0,
    availabilityStatus: 'AVAILABLE',
    badges: ['5G'],
    compatiblePlanIds: ZA_PLAN_IDS,
    onboardingRequirements: ['SIM_OR_ESIM_SELECTION'],
    metadata: { brand: 'Samsung', storage: '128GB', colour: 'White', simType: 'NANO_SIM', subcategory: 'smartphones' },
  },
  {
    productId: 'prod_za_iphone14_128',
    productType: 'DEVICE',
    name: 'iPhone 14 128GB',
    marketCode: 'ZA',
    priceOnceOff: 15999,
    priceRecurring: 0,
    availabilityStatus: 'AVAILABLE',
    badges: ['5G', 'Trade-In Eligible'],
    compatiblePlanIds: ZA_PLAN_IDS,
    onboardingRequirements: ['SIM_OR_ESIM_SELECTION'],
    requiresPaymentMethod: 'WALLET_PREMIUM',
    metadata: { brand: 'Apple', storage: '128GB', colour: 'Midnight', simType: 'ESIM', subcategory: 'smartphones' },
  },
];

export const ALL_PRODUCTS: ProductSeed[] = [
  ...ZA_DEVICES,
  ...ZA_PLANS,
];

const BY_ID = new Map<string, ProductSeed>(ALL_PRODUCTS.map(p => [p.productId, p]));
const BY_MARKET = new Map<string, ProductSeed[]>();
for (const p of ALL_PRODUCTS) {
  const list = BY_MARKET.get(p.marketCode) ?? [];
  list.push(p);
  BY_MARKET.set(p.marketCode, list);
}

const CATEGORY_TYPE_MAP: Record<string, string> = {
  devices: 'DEVICE',
  plans: 'PLAN',
  bundles: 'BUNDLE',
  sim: 'SIM',
  esim: 'ESIM',
  accessories: 'ACCESSORY',
};

export function getProductsForMarket(
  marketCode: string,
  category?: string,
): ProductSeed[] {
  const products = BY_MARKET.get(marketCode.toUpperCase()) ?? [];
  if (!category) return products;
  const productType = CATEGORY_TYPE_MAP[category.toLowerCase()];
  if (!productType) return [];
  return products.filter(p => p.productType === productType);
}

export function getProductById(productId: string): ProductSeed | undefined {
  return BY_ID.get(productId);
}

export function getPlansForMarket(marketCode: string): ProductSeed[] {
  return (BY_MARKET.get(marketCode.toUpperCase()) ?? []).filter(p => p.productType === 'PLAN');
}
