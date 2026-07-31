import { PrepaidUpsellOffer } from './prepaid-upsell-offer.model';

export const prepaidUpsellOffers: PrepaidUpsellOffer[] = [
  {
    offerId: 'offer_prepaid_upsell_weekend_max',
    type: 'upsell',
    title: 'Weekend Max Bundle',
    description: 'Get unlimited weekend data plus 10GB anytime data — more value for your prepaid spend.',
    badge: 'Best Value',
    baseOfferRef: 'bundle_weekend_max',
    pricingSummary: {
      currency: 'ZAR',
      onceOffAmount: 0,
      recurringAmount: 299.00,
      discountLabel: '20% off first month',
    },
    ctaLabel: 'Upgrade to Bundle',
    isPromotional: true,
  },
  {
    offerId: 'offer_prepaid_migrate_red_flexi',
    type: 'migration',
    title: 'Switch to Red Flexi Contract',
    description: 'Move from prepaid to a flexible monthly contract and save up to R150 per month with no lock-in.',
    badge: 'No Lock-in',
    baseOfferRef: 'plan_red_flexi',
    pricingSummary: {
      currency: 'ZAR',
      recurringAmount: 199.00,
      discountLabel: 'From R199/month',
    },
    ctaLabel: 'Switch to Contract',
    isPromotional: true,
  },
];
