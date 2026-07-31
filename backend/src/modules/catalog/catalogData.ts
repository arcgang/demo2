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
    productId: 'prod_za_iphone15_128',
    productType: 'DEVICE',
    name: 'iPhone 15 128GB',
    marketCode: 'ZA',
    priceOnceOff: 18999,
    priceRecurring: 0,
    availabilityStatus: 'AVAILABLE',
    badges: ['5G', 'Trade-In Eligible', 'New'],
    compatiblePlanIds: ZA_PLAN_IDS,
    onboardingRequirements: ['SIM_OR_ESIM_SELECTION'],
    metadata: { brand: 'Apple', storage: '128GB', colour: 'Midnight', simType: 'ESIM' },
  },
  {
    productId: 'prod_za_iphone15_256',
    productType: 'DEVICE',
    name: 'iPhone 15 256GB',
    marketCode: 'ZA',
    priceOnceOff: 21499,
    priceRecurring: 0,
    availabilityStatus: 'AVAILABLE',
    badges: ['5G', 'Trade-In Eligible', 'New'],
    compatiblePlanIds: ZA_PLAN_IDS,
    onboardingRequirements: ['SIM_OR_ESIM_SELECTION'],
    metadata: { brand: 'Apple', storage: '256GB', colour: 'Pink', simType: 'ESIM' },
  },
  {
    productId: 'prod_za_samsung_s24_256',
    productType: 'DEVICE',
    name: 'Samsung Galaxy S24 256GB',
    marketCode: 'ZA',
    priceOnceOff: 17999,
    priceRecurring: 0,
    availabilityStatus: 'AVAILABLE',
    badges: ['5G', 'Trade-In Eligible', 'AI Ready'],
    compatiblePlanIds: ZA_PLAN_IDS,
    onboardingRequirements: ['SIM_OR_ESIM_SELECTION'],
    metadata: { brand: 'Samsung', storage: '256GB', colour: 'Phantom Black', simType: 'NANO_SIM' },
  },
  {
    productId: 'prod_za_samsung_s24ultra_512',
    productType: 'DEVICE',
    name: 'Samsung Galaxy S24 Ultra 512GB',
    marketCode: 'ZA',
    priceOnceOff: 27999,
    priceRecurring: 0,
    availabilityStatus: 'AVAILABLE',
    badges: ['5G', 'Trade-In Eligible', 'AI Ready', 'S-Pen'],
    compatiblePlanIds: ZA_PLAN_IDS,
    onboardingRequirements: ['SIM_OR_ESIM_SELECTION'],
    metadata: { brand: 'Samsung', storage: '512GB', colour: 'Titanium Gray', simType: 'NANO_SIM' },
  },
  {
    productId: 'prod_za_xiaomi14_256',
    productType: 'DEVICE',
    name: 'Xiaomi 14 256GB',
    marketCode: 'ZA',
    priceOnceOff: 13999,
    priceRecurring: 0,
    availabilityStatus: 'AVAILABLE',
    badges: ['5G', 'Leica Camera'],
    compatiblePlanIds: ZA_PLAN_IDS,
    onboardingRequirements: ['SIM_OR_ESIM_SELECTION'],
    metadata: { brand: 'Xiaomi', storage: '256GB', colour: 'Black', simType: 'NANO_SIM' },
  },
  {
    productId: 'prod_za_oppo_reno12_256',
    productType: 'DEVICE',
    name: 'OPPO Reno 12 256GB',
    marketCode: 'ZA',
    priceOnceOff: 9999,
    priceRecurring: 0,
    availabilityStatus: 'AVAILABLE',
    badges: ['5G', 'AI Portrait'],
    compatiblePlanIds: ZA_PLAN_IDS,
    onboardingRequirements: ['SIM_OR_ESIM_SELECTION'],
    metadata: { brand: 'OPPO', storage: '256GB', colour: 'Sunset Gold', simType: 'NANO_SIM' },
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
  if (!productType) return products;
  return products.filter(p => p.productType === productType);
}

export function getProductById(productId: string): ProductSeed | undefined {
  return BY_ID.get(productId);
}

export function getPlansForMarket(marketCode: string): ProductSeed[] {
  return (BY_MARKET.get(marketCode.toUpperCase()) ?? []).filter(p => p.productType === 'PLAN');
}
