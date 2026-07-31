export type PrepaidUpsellOfferType = 'upsell' | 'migration';

export interface PricingSummary {
  currency: string;
  onceOffAmount?: number;
  recurringAmount?: number;
  discountLabel?: string;
}

export interface PrepaidUpsellOffer {
  offerId: string;
  type: PrepaidUpsellOfferType;
  title: string;
  description: string;
  badge?: string | null;
  baseOfferRef: string;
  pricingSummary: PricingSummary;
  ctaLabel: string;
  isPromotional: true;
}
