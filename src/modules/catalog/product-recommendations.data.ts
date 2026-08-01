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
