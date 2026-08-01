export interface AttachmentItem {
  id: string;
  name: string;
  type: 'PLAN' | 'ACCESSORY' | 'ADDON';
  required: boolean;
  pricingRule: { onceOff: number; monthly: number };
}

export interface ProductRecommendations {
  deviceId: string;
  attachments: AttachmentItem[];
}

export interface ProductHero {
  deviceId: string;
  name: string;
  priceOnceOff: number;
  monthlyFrom: number;
  badgeLabels: string[];
  colors: string[];
  storageOptions: string[];
}

const IPHONE15PRO_RECOMMENDATIONS: ProductRecommendations = {
  deviceId: 'prod_za_iphone15pro_256',
  attachments: [
    {
      id: 'plan_za_red_5gb',
      name: 'Vodacom Red 5GB',
      type: 'PLAN',
      required: true,
      pricingRule: { onceOff: 0, monthly: 299 },
    },
    {
      id: 'plan_za_unlimited_20gb',
      name: 'Vodacom Unlimited 20GB',
      type: 'PLAN',
      required: true,
      pricingRule: { onceOff: 0, monthly: 799 },
    },
    {
      id: 'plan_za_red_premium',
      name: 'Vodacom Red Premium',
      type: 'PLAN',
      required: true,
      pricingRule: { onceOff: 0, monthly: 1299 },
    },
    {
      id: 'acc_za_airpods_pro',
      name: 'AirPods Pro',
      type: 'ACCESSORY',
      required: false,
      pricingRule: { onceOff: 4999, monthly: 0 },
    },
    {
      id: 'acc_za_iphone15pro_case',
      name: 'iPhone 15 Pro Case',
      type: 'ACCESSORY',
      required: false,
      pricingRule: { onceOff: 799, monthly: 0 },
    },
    {
      id: 'acc_za_20w_adapter',
      name: '20W USB-C Power Adapter',
      type: 'ACCESSORY',
      required: false,
      pricingRule: { onceOff: 399, monthly: 0 },
    },
    {
      id: 'acc_za_screen_protector',
      name: 'Screen Protector',
      type: 'ACCESSORY',
      required: false,
      pricingRule: { onceOff: 299, monthly: 0 },
    },
  ],
};

export function getIphone15ProRecommendations(): ProductRecommendations {
  return IPHONE15PRO_RECOMMENDATIONS;
}

const RECOMMENDATIONS_BY_SLUG = new Map<string, ProductRecommendations>([
  ['iphone-15-pro', IPHONE15PRO_RECOMMENDATIONS],
]);

export function getRecommendationsBySlug(slug: string): ProductRecommendations | undefined {
  return RECOMMENDATIONS_BY_SLUG.get(slug);
}

const RECOMMENDATIONS_BY_DEVICE_ID = new Map<string, ProductRecommendations>(
  [...RECOMMENDATIONS_BY_SLUG.values()].map(r => [r.deviceId, r]),
);

export function getRecommendationsByDeviceId(deviceId: string): ProductRecommendations | undefined {
  return RECOMMENDATIONS_BY_DEVICE_ID.get(deviceId);
}

const HERO_BY_SLUG = new Map<string, ProductHero>([
  [
    'iphone-15-pro',
    {
      deviceId: 'prod_za_iphone15pro_256',
      name: 'iPhone 15 Pro 256GB',
      priceOnceOff: 24999,
      monthlyFrom: 899,
      badgeLabels: ['5G', 'Trade-In Eligible', 'In Stock'],
      colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'],
      storageOptions: ['128GB', '256GB', '512GB', '1TB'],
    },
  ],
]);

export function getProductHeroBySlug(slug: string): ProductHero | undefined {
  return HERO_BY_SLUG.get(slug);
}
