import { Router, Request, Response } from 'express';
import { processOnboardingSession } from '../modules/onboarding/onboardingSession';
import { OnboardingSessionRequest, OnboardingStage } from '../types/shared';

const VALID_STAGES: OnboardingStage[] = ['personal', 'address', 'rica'];

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

  if (body.stage !== undefined && !(VALID_STAGES as string[]).includes(body.stage)) {
    res.status(400).json({
      errorCode: 'INVALID_STAGE',
      message: `stage must be one of: ${VALID_STAGES.join(', ')}.`,
    });
    return;
  }

  const result = processOnboardingSession(body);
  res.status(200).json(result);
});

export default router;
