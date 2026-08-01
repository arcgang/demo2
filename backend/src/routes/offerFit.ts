import { Router, Request, Response } from 'express';
import { checkOfferFit } from '../modules/catalog/offerFitService';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const { deviceId, planId } = req.body as Record<string, unknown>;

  if (typeof deviceId !== 'string' || !deviceId.trim() ||
      typeof planId !== 'string' || !planId.trim()) {
    res.status(400).json({
      errorCode: 'MISSING_REQUIRED_FIELDS',
      message: 'Both deviceId and planId are required.',
    });
    return;
  }

  const result = checkOfferFit(deviceId, planId);

  if (!result.compatible) {
    res.status(422).json({
      compatible: false,
      reason: result.reason,
    });
    return;
  }

  res.status(200).json({
    compatible: true,
    pricing: result.pricing,
  });
});

export default router;
