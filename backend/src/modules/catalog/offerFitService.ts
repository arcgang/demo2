import { getProductById } from './catalogData';
import { getMarket } from '../market/marketConfig';

export interface OfferFitPricing {
  onceOff: number;
  monthly: number;
  vatRate: number;
}

export interface OfferFitResult {
  compatible: boolean;
  reason?: string;
  pricing?: OfferFitPricing;
}

export function checkOfferFit(deviceId: string, planId: string): OfferFitResult {
  const device = getProductById(deviceId);
  if (!device || device.productType !== 'DEVICE') {
    return { compatible: false, reason: 'The selected device was not found.' };
  }

  const plan = getProductById(planId);
  if (!plan || plan.productType !== 'PLAN') {
    return { compatible: false, reason: 'The selected plan was not found or is not available.' };
  }

  if (!device.compatiblePlanIds.includes(planId)) {
    return {
      compatible: false,
      reason: 'This plan is not compatible with the selected device.',
    };
  }

  const market = getMarket(device.marketCode);
  const vatRate = market ? market.vatRate : 0.15;

  return {
    compatible: true,
    pricing: {
      onceOff: device.priceOnceOff,
      monthly: plan.priceRecurring,
      vatRate,
    },
  };
}
