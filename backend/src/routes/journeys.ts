import { Router, Request, Response } from 'express';
import { getJourneyFields } from '../modules/journeyFields/journeyFieldsRegistry';

const router = Router();

router.get('/:type/fields', (req: Request, res: Response) => {
  const { type } = req.params;
  const fields = getJourneyFields(type);

  if (!fields) {
    res.status(404).json({
      errorCode: 'JOURNEY_TYPE_NOT_FOUND',
      message: `Unknown journey type: "${type}". Supported types are: purchase, onboarding, activation.`,
    });
    return;
  }

  res.status(200).json(fields);
});

export default router;
