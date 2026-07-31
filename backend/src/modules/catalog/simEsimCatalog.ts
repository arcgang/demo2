import { SimEsimCatalogResponse } from '../../types/shared';

// Mock TMF620-aligned SIM/eSIM offer catalog
export function getSimEsimCatalog(): SimEsimCatalogResponse {
  return {
    offers: [
      {
        id: 'offer_sim_starter',
        name: 'Vodacom SIM Starter Pack',
        type: 'sim',
        pricing: { onceOff: 1.00, currency: 'ZAR' },
        planOptions: [
          {
            planId: 'plan_red_5gb',
            name: 'Vodacom Red 5GB',
            recurringAmount: 299.00,
            currency: 'ZAR',
          },
          {
            planId: 'plan_unlimited_20gb',
            name: 'Vodacom Unlimited 20GB',
            recurringAmount: 799.00,
            currency: 'ZAR',
          },
          {
            planId: 'plan_red_premium',
            name: 'Vodacom Red Premium',
            recurringAmount: 1299.00,
            currency: 'ZAR',
          },
        ],
      },
      {
        id: 'offer_sim_prepaid',
        name: 'Vodacom Prepaid SIM',
        type: 'sim',
        pricing: { onceOff: 0.00, currency: 'ZAR' },
        planOptions: [
          {
            planId: 'plan_prepaid_1gb',
            name: 'Prepaid 1GB Daily',
            recurringAmount: 0.00,
            currency: 'ZAR',
          },
          {
            planId: 'plan_prepaid_5gb',
            name: 'Prepaid 5GB Monthly',
            recurringAmount: 0.00,
            currency: 'ZAR',
          },
        ],
      },
      {
        id: 'offer_esim_connect',
        name: 'Vodacom eSIM Connect',
        type: 'esim',
        pricing: { onceOff: 0.00, currency: 'ZAR' },
        planOptions: [
          {
            planId: 'plan_unlimited_20gb',
            name: 'Vodacom Unlimited 20GB',
            recurringAmount: 799.00,
            currency: 'ZAR',
          },
          {
            planId: 'plan_red_premium',
            name: 'Vodacom Red Premium',
            recurringAmount: 1299.00,
            currency: 'ZAR',
          },
        ],
      },
      {
        id: 'offer_esim_business',
        name: 'Vodacom eSIM Business',
        type: 'esim',
        pricing: { onceOff: 0.00, currency: 'ZAR' },
        planOptions: [
          {
            planId: 'plan_business_10gb',
            name: 'Business 10GB',
            recurringAmount: 999.00,
            currency: 'ZAR',
          },
          {
            planId: 'plan_business_unlimited',
            name: 'Business Unlimited',
            recurringAmount: 1599.00,
            currency: 'ZAR',
          },
        ],
      },
    ],
  };
}
