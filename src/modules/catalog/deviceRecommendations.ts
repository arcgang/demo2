export interface AttachmentDef {
  id: string;
  name: string;
  type: 'PLAN' | 'ADDON';
  required: boolean;
  monthly: number;
  description: string;
  checkboxName?: string;
  defaultChecked?: boolean;
}

export interface DeviceRecommendations {
  deviceId: string;
  deviceName: string;
  devicePrice: number;
  activationFee: number;
  colour: string;
  attachments: AttachmentDef[];
}

const SLUG_MAP: Record<string, DeviceRecommendations> = {
  'iphone-15-pro': {
    deviceId: 'prod_za_iphone15pro_256',
    deviceName: 'iPhone 15 Pro 256GB',
    devicePrice: 24999,
    activationFee: 0,
    colour: 'Natural Titanium',
    attachments: [
      {
        id: 'plan_za_red_5gb',
        name: 'Vodacom Red 5GB',
        type: 'PLAN',
        required: true,
        monthly: 299,
        description: '5GB Data + Unlimited Calls &amp; SMS',
      },
      {
        id: 'plan_za_unlimited_20gb',
        name: 'Vodacom Unlimited 20GB',
        type: 'PLAN',
        required: true,
        monthly: 799,
        description: '20GB Data + Unlimited Calls &amp; SMS',
        defaultChecked: true,
      },
      {
        id: 'plan_za_red_premium',
        name: 'Vodacom Red Premium',
        type: 'PLAN',
        required: true,
        monthly: 1299,
        description: '50GB Data + Unlimited Calls &amp; SMS',
      },
      {
        id: 'addon_za_extra_10gb',
        name: 'Extra 10GB Data',
        type: 'ADDON',
        required: false,
        monthly: 199,
        description: 'Additional data for streaming and browsing',
        checkboxName: 'addon-data',
      },
      {
        id: 'addon_za_intl_calling',
        name: 'International Calling',
        type: 'ADDON',
        required: false,
        monthly: 149,
        description: '100 minutes to selected countries',
        checkboxName: 'addon-international',
        defaultChecked: true,
      },
      {
        id: 'addon_za_roaming',
        name: 'Roaming Bundle',
        type: 'ADDON',
        required: false,
        monthly: 299,
        description: '5GB data for use in Africa',
        checkboxName: 'addon-roaming',
      },
    ],
  },
};

export function getRecommendationsBySlug(slug: string): DeviceRecommendations | undefined {
  return SLUG_MAP[slug];
}
