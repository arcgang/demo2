import { Router, Request, Response } from 'express';
import { buildEligibilityResult } from '../modules/eligibility/eligibility.fixtures';
import { resolveToken } from '../modules/auth/resolve-token';

const router = Router();

router.get('/eligibility', (req: Request, res: Response) => {
  const token = resolveToken(req);
  if (!token) {
    res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'Authorization header with Bearer token is required.' });
    return;
  }

  const result = buildEligibilityResult(token);
  if (!result) {
    res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'Unrecognised token.' });
    return;
  }

  res.status(200).json(result);
});

export default router;
