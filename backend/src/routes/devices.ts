import { Router, Request, Response } from 'express';
import { getDeviceRecommendations } from '../modules/devices/deviceRecommendationsData';
import { calculateRecommendationsPricing, SelectedAttachment } from '../modules/devices/recommendationsPricingCalculator';
import { buildStructuredError } from '../modules/errorClassification/errorSchema';

const router = Router();

router.get('/:id/recommendations', (req: Request, res: Response) => {
  const { id } = req.params;

  const seed = getDeviceRecommendations(id);
  if (!seed) {
    res.status(404).json(
      buildStructuredError('not_found', {
        errorCode: 'DEVICE_NOT_FOUND',
        message: `No recommendations found for device "${id}".`,
      }),
    );
    return;
  }

  // Plans are mutually exclusive: a customer picks exactly one.
  // Use only the cheapest required plan as a "from" baseline so monthlyTotal
  // reflects a real minimum customer scenario rather than an impossible sum.
  const requiredPlans = seed.attachments.filter(a => a.required && a.type === 'PLAN');
  const cheapestPlan = requiredPlans.length > 0
    ? requiredPlans.reduce((min, p) => p.pricingRule.monthly < min.pricingRule.monthly ? p : min)
    : null;
  const requiredNonPlans = seed.attachments.filter(a => a.required && a.type !== 'PLAN');

  const pricingInputs: SelectedAttachment[] = [
    ...(cheapestPlan ? [cheapestPlan] : []),
    ...requiredNonPlans,
  ].map(a => ({ id: a.id, type: a.type, required: a.required, pricingRule: a.pricingRule }));

  const pricingSummary = calculateRecommendationsPricing(pricingInputs);

  res.status(200).json({
    deviceId: seed.deviceId,
    attachments: seed.attachments,
    pricingSummary,
  });
});

export default router;
