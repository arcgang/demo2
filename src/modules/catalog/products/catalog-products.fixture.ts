export type ProductType = 'DEVICE' | 'SIM' | 'ESIM' | 'ACCESSORY';
export type Availability = 'in-stock' | 'pre-order';
export type Category = 'smartphones' | 'sim-esim' | 'accessories';

export interface AttachablePlan {
  id: string;
  name: string;
  data: string;
  pricePerMonth: number;
}

export interface AttachableBundle {
  id: string;
  name: string;
  pricePerMonth: number;
}

export interface CatalogProduct {
  slug: string;
  name: string;
  productType: ProductType;
  category: Category;
  price: {
    onceOff: number;
    currency: string;
    fromPricePerMonth?: number | null;
  };
  availability: Availability;
  badges: string[];
  financingEligible: boolean;
  tradeInEligible: boolean;
  attachablePlans: AttachablePlan[];
  attachableBundles: AttachableBundle[];
  verificationRequired?: boolean;
  activationRequirements?: string[];
  compatibleDeviceFamilies?: string[];
  compatibilityCues?: string[];
}

const SHARED_PLANS: AttachablePlan[] = [
  { id: 'plan_unlimited_20gb', name: 'Unlimited 20GB', data: '20GB', pricePerMonth: 799 },
  { id: 'plan_red_premium', name: 'Red Premium', data: '50GB', pricePerMonth: 1199 },
];

const FLEXI_PLAN: AttachablePlan[] = [
  { id: 'plan_flexi_basic', name: 'Flexi Basic', data: '5GB', pricePerMonth: 299 },
];

const SHARED_BUNDLES: AttachableBundle[] = [
  { id: 'bundle_weekend_max', name: 'Weekend Max Bundle', pricePerMonth: 299 },
  { id: 'bundle_family_share', name: 'Family Share', pricePerMonth: 499 },
];

export const catalogProducts: CatalogProduct[] = [
  {
    slug: 'iphone-15-pro-256gb',
    name: 'iPhone 15 Pro 256GB',
    productType: 'DEVICE',
    category: 'smartphones',
    price: { onceOff: 28999, currency: 'ZAR', fromPricePerMonth: 1208 },
    availability: 'in-stock',
    badges: ['5G', 'Trade-In Eligible'],
    financingEligible: true,
    tradeInEligible: true,
    attachablePlans: SHARED_PLANS,
    attachableBundles: SHARED_BUNDLES,
  },
  {
    slug: 'samsung-galaxy-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra',
    productType: 'DEVICE',
    category: 'smartphones',
    price: { onceOff: 26999, currency: 'ZAR', fromPricePerMonth: 1125 },
    availability: 'in-stock',
    badges: ['5G', 'Trade-In Eligible'],
    financingEligible: true,
    tradeInEligible: true,
    attachablePlans: SHARED_PLANS,
    attachableBundles: SHARED_BUNDLES,
  },
  {
    slug: 'iphone-15-128gb',
    name: 'iPhone 15 128GB',
    productType: 'DEVICE',
    category: 'smartphones',
    price: { onceOff: 18999, currency: 'ZAR', fromPricePerMonth: 792 },
    availability: 'in-stock',
    badges: ['5G', 'Trade-In Eligible'],
    financingEligible: true,
    tradeInEligible: true,
    attachablePlans: SHARED_PLANS,
    attachableBundles: SHARED_BUNDLES,
  },
  {
    slug: 'sim-only-standard',
    name: 'SIM-Only Standard',
    productType: 'SIM',
    category: 'sim-esim',
    price: { onceOff: 0, currency: 'ZAR', fromPricePerMonth: 299 },
    availability: 'in-stock',
    badges: [],
    financingEligible: false,
    tradeInEligible: false,
    attachablePlans: FLEXI_PLAN,
    attachableBundles: SHARED_BUNDLES,
    verificationRequired: true,
    activationRequirements: [
      'RICA registration required',
      'Valid South African ID or passport',
      'Proof of address',
    ],
  },
  {
    slug: 'esim-standard',
    name: 'eSIM Standard',
    productType: 'ESIM',
    category: 'sim-esim',
    price: { onceOff: 0, currency: 'ZAR', fromPricePerMonth: 299 },
    availability: 'in-stock',
    badges: [],
    financingEligible: false,
    tradeInEligible: false,
    attachablePlans: FLEXI_PLAN,
    attachableBundles: SHARED_BUNDLES,
    verificationRequired: true,
    activationRequirements: [
      'RICA registration required',
      'Compatible eSIM device required',
      'QR code activation via device settings',
    ],
  },
  {
    slug: 'silicone-case',
    name: 'Silicone Case',
    productType: 'ACCESSORY',
    category: 'accessories',
    price: { onceOff: 499, currency: 'ZAR' },
    availability: 'in-stock',
    badges: [],
    financingEligible: false,
    tradeInEligible: false,
    attachablePlans: [],
    attachableBundles: [],
    compatibleDeviceFamilies: ['iPhone 15', 'iPhone 15 Pro'],
    compatibilityCues: [
      'Compatible with iPhone 15 series',
      'Compatible with iPhone 15 Pro series',
    ],
  },
  {
    slug: 'usb-c-adapter',
    name: 'USB-C Adapter',
    productType: 'ACCESSORY',
    category: 'accessories',
    price: { onceOff: 299, currency: 'ZAR' },
    availability: 'in-stock',
    badges: [],
    financingEligible: false,
    tradeInEligible: false,
    attachablePlans: [],
    attachableBundles: [],
    compatibleDeviceFamilies: ['iPhone 15', 'iPhone 15 Pro', 'Samsung Galaxy S24'],
    compatibilityCues: [
      'Compatible with iPhone 15 series',
      'Compatible with Samsung Galaxy S24 series',
    ],
  },
];
