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

// Galaxy S24 seed — includes a required non-PLAN accessory so that contract
// tests can assert a meaningful non-zero onceOffSubtotal and vatAmount.
const GALAXY_S24_RECOMMENDATIONS: DeviceRecommendationsSeed = {
  deviceId: 'prod_za_galaxy_s24_256',
  attachments: [
    // Plans — required (mutually exclusive; customer picks one)
    {
      id: 'plan_za_galaxy_1gb',
      name: 'Galaxy Plan 1GB',
      type: 'PLAN',
      required: true,
      pricingRule: { onceOff: 0, monthly: 199 },
    },
    {
      id: 'plan_za_galaxy_5gb',
      name: 'Galaxy Plan 5GB',
      type: 'PLAN',
      required: true,
      pricingRule: { onceOff: 0, monthly: 399 },
    },
    // Required non-plan accessory — yields non-zero onceOffSubtotal in pricingSummary
    {
      id: 'acc_za_galaxy_s24_charger',
      name: 'USB-C 45W Charger',
      type: 'ACCESSORY',
      required: true,
      pricingRule: { onceOff: 499, monthly: 0 },
    },
    // Optional accessories
    {
      id: 'acc_za_galaxy_buds2',
      name: 'Galaxy Buds2',
      type: 'ACCESSORY',
      required: false,
      pricingRule: { onceOff: 2999, monthly: 0 },
    },
    {
      id: 'acc_za_galaxy_s24_clear_case',
      name: 'S24 Clear Case',
      type: 'ACCESSORY',
      required: false,
      pricingRule: { onceOff: 499, monthly: 0 },
    },
  ],
};

const DEVICE_RECOMMENDATIONS = new Map<string, DeviceRecommendationsSeed>([
  [IPHONE15PRO_RECOMMENDATIONS.deviceId, IPHONE15PRO_RECOMMENDATIONS],
  [GALAXY_S24_RECOMMENDATIONS.deviceId, GALAXY_S24_RECOMMENDATIONS],
]);

export function getDeviceRecommendations(deviceId: string): DeviceRecommendationsSeed | undefined {
  return DEVICE_RECOMMENDATIONS.get(deviceId);
}
