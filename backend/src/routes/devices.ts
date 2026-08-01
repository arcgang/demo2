import { Router, Request, Response } from 'express';
import { getDeviceRecommendations } from '../modules/devices/deviceRecommendationsData';
import { calculateRecommendationsPricing, SelectedAttachment } from '../modules/devices/recommendationsPricingCalculator';

const router = Router();

router.get('/:id/recommendations', (req: Request, res: Response) => {
  const { id } = req.params;

  const seed = getDeviceRecommendations(id);
  if (!seed) {
    res.status(404).json({
      errorCode: 'DEVICE_NOT_FOUND',
      message: `No recommendations found for device "${id}".`,
    });
    return;
  }

  const requiredAttachments: SelectedAttachment[] = seed.attachments
    .filter(a => a.required)
    .map(a => ({ id: a.id, type: a.type, required: a.required, pricingRule: a.pricingRule }));

  const pricingSummary = calculateRecommendationsPricing(requiredAttachments);

  res.status(200).json({
    deviceId: seed.deviceId,
    attachments: seed.attachments,
    pricingSummary,
  });
});

export default router;
