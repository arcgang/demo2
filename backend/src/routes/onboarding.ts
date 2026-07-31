import { Router, Request, Response } from 'express';
import { processOnboardingSession } from '../modules/onboarding/onboardingSession';
import { OnboardingSessionRequest } from '../types/shared';

const router = Router();

router.post('/session', (req: Request, res: Response) => {
  const body = req.body as OnboardingSessionRequest;

  if (!body || typeof body.data !== 'object' || body.data === null || Array.isArray(body.data)) {
    res.status(400).json({
      errorCode: 'INVALID_REQUEST',
      message: 'Request body must include a data object.',
    });
    return;
  }

  const result = processOnboardingSession(body);
  res.status(200).json(result);
});

export default router;
