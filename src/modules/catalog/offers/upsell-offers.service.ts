import { PrepaidUpsellOffer } from './prepaid-upsell-offer.model';
import { prepaidUpsellOffers } from './upsell-offers.fixture';

export function getUpsellOffersByContext(context: string): PrepaidUpsellOffer[] {
  if (context === 'prepaid') {
    return prepaidUpsellOffers;
  }
  return [];
}
