import { Router, Request, Response } from 'express';
import { buildEligibilityResult } from '../modules/eligibility/eligibility.fixtures';

const router = Router();

function resolveToken(req: Request): string | null {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

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
