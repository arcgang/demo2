export interface AttachmentSeed {
  id: string;
  name: string;
  type: 'PLAN' | 'ACCESSORY' | 'ADDON';
  required: boolean;
  pricingRule: { onceOff: number; monthly: number };
}

export interface DeviceRecommendationsSeed {
  deviceId: string;
  attachments: AttachmentSeed[];
}

const IPHONE15PRO_RECOMMENDATIONS: DeviceRecommendationsSeed = {
  deviceId: 'prod_za_iphone15pro_256',
  attachments: [
    // Plans — required
    {
      id: 'plan_za_red_5gb',
      name: 'Vodacom Red 5GB',
      type: 'PLAN',
      required: true,
      pricingRule: { onceOff: 0, monthly: 299 },
    },
    {
      id: 'plan_za_unlimited_20gb',
      name: 'Unlimited 20GB',
      type: 'PLAN',
      required: true,
      pricingRule: { onceOff: 0, monthly: 799 },
    },
    {
      id: 'plan_za_red_premium',
      name: 'Red Premium',
      type: 'PLAN',
      required: true,
      pricingRule: { onceOff: 0, monthly: 1299 },
    },
    // Accessories — optional
    {
      id: 'acc_za_airpods_pro',
      name: 'AirPods Pro',
      type: 'ACCESSORY',
      required: false,
      pricingRule: { onceOff: 4999, monthly: 0 },
    },
    {
      id: 'acc_za_silicone_case',
      name: 'Silicone Case',
      type: 'ACCESSORY',
      required: false,
      pricingRule: { onceOff: 799, monthly: 0 },
    },
    {
      id: 'acc_za_20w_adapter',
      name: '20W Adapter',
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
    // Add-ons — optional
    {
      id: 'addon_za_extra_10gb',
      name: 'Extra 10GB',
      type: 'ADDON',
      required: false,
      pricingRule: { onceOff: 0, monthly: 199 },
    },
    {
      id: 'addon_za_intl_calling',
      name: 'International Calling',
      type: 'ADDON',
      required: false,
      pricingRule: { onceOff: 0, monthly: 149 },
    },
    {
      id: 'addon_za_roaming',
      name: 'Roaming',
      type: 'ADDON',
      required: false,
      pricingRule: { onceOff: 0, monthly: 299 },
    },
  ],
};

const DEVICE_RECOMMENDATIONS = new Map<string, DeviceRecommendationsSeed>([
  [IPHONE15PRO_RECOMMENDATIONS.deviceId, IPHONE15PRO_RECOMMENDATIONS],
]);

export function getDeviceRecommendations(deviceId: string): DeviceRecommendationsSeed | undefined {
  return DEVICE_RECOMMENDATIONS.get(deviceId);
}
