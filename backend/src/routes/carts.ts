import { Router, Request, Response } from 'express';
import { buildEligibilityResult } from '../modules/eligibility/eligibility.fixtures';

const router = Router();

const UPGRADE_ONLY_LINE_TYPE = 'UPGRADE_OFFER';

function resolveToken(req: Request): string | null {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

function hasUpgradeOnlyLine(lines: unknown[]): boolean {
  return lines.some(
    (l) => l !== null && typeof l === 'object' && (l as Record<string, unknown>)['lineType'] === UPGRADE_ONLY_LINE_TYPE,
  );
}

router.post('/:cartId/items', (req: Request, res: Response) => {
  const { lines } = req.body as { lines?: unknown[] };

  if (!Array.isArray(lines) || !hasUpgradeOnlyLine(lines)) {
    // Non-upgrade-only cart operations pass through (stub: 200 OK).
    res.status(200).json({ cartId: req.params['cartId'], status: 'UPDATED' });
    return;
  }

  const token = resolveToken(req);
  if (!token) {
    res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'Authorization header with Bearer token is required.' });
    return;
  }

  const eligibility = buildEligibilityResult(token);
  if (!eligibility) {
    res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'Unrecognised token.' });
    return;
  }

  if (eligibility.status === 'NOT_ELIGIBLE') {
    res.status(403).json(eligibility);
    return;
  }

  res.status(200).json({ cartId: req.params['cartId'], status: 'UPDATED' });
});

export default router;
