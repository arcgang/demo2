import { Router, Request, Response } from 'express';
import { checkEligibility } from '../modules/upgrade/eligibilityAdapter';
import { getFinancingQuotes } from '../modules/upgrade/financingAdapter';
import { getTradeInQuote } from '../modules/upgrade/tradeInAdapter';
import { resolveSession, getState, patchState, UpgradeSessionState } from '../modules/upgrade/sessionStore';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/upgrade/eligibility
// ---------------------------------------------------------------------------

router.post('/eligibility', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const errors: Array<{ field: string; message: string }> = [];

  for (const field of ['customerId', 'lineId', 'marketCode'] as const) {
    const v = body[field];
    if (v === undefined || v === null || v === '') {
      errors.push({ field, message: `${field} is required and must not be empty.` });
    }
  }

  if (errors.length > 0) {
    res.status(422).json({ errorCode: 'VALIDATION_ERROR', errors });
    return;
  }

  const result = checkEligibility(
    body.customerId as string,
    body.lineId as string,
    body.marketCode as string,
  );

  res.status(200).json(result);
});

// ---------------------------------------------------------------------------
// GET /api/upgrade/financing
// ---------------------------------------------------------------------------

router.get('/financing', (_req: Request, res: Response) => {
  res.status(200).json(getFinancingQuotes());
});

// ---------------------------------------------------------------------------
// POST /api/upgrade/trade-in/valuation
// ---------------------------------------------------------------------------

router.post('/trade-in/valuation', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const errors: Array<{ field: string; message: string }> = [];

  for (const field of ['brand', 'model', 'condition'] as const) {
    const v = body[field];
    if (v === undefined || v === null || v === '') {
      errors.push({ field, message: `${field} is required and must not be empty.` });
    }
  }

  const storage = body.storage;
  if (storage === undefined || storage === null) {
    errors.push({ field: 'storage', message: 'storage is required and must not be empty.' });
  } else if (typeof storage !== 'number' || storage < 0) {
    errors.push({ field: 'storage', message: 'storage must be a non-negative number.' });
  }

  if (errors.length > 0) {
    res.status(422).json({ errorCode: 'VALIDATION_ERROR', errors });
    return;
  }

  const quote = getTradeInQuote(
    body.brand as string,
    body.model as string,
    body.storage as number,
    body.condition as string,
  );

  res.status(200).json(quote);
});

// ---------------------------------------------------------------------------
// GET /api/upgrade/session
// ---------------------------------------------------------------------------

router.get('/session', (req: Request, res: Response) => {
  const sessionId = resolveSession(req, res);
  res.status(200).json(getState(sessionId));
});

// ---------------------------------------------------------------------------
// PUT /api/upgrade/session
// ---------------------------------------------------------------------------

router.put('/session', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const ALLOWED_KEYS: Array<keyof UpgradeSessionState> = ['eligibility', 'financing', 'tradeIn'];
  const patch: Partial<UpgradeSessionState> = {};

  for (const key of ALLOWED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      const v = body[key];
      patch[key] = (v !== null && typeof v === 'object') ? (v as Record<string, unknown>) : null;
    }
  }

  const hasKnownKey = ALLOWED_KEYS.some((k) => Object.prototype.hasOwnProperty.call(body, k));
  const hasUnknownKey = Object.keys(body).some((k) => !ALLOWED_KEYS.includes(k as keyof UpgradeSessionState));

  if (!hasKnownKey && hasUnknownKey) {
    res.status(422).json({ errorCode: 'VALIDATION_ERROR', message: 'Body must contain at least one of: eligibility, financing, tradeIn.' });
    return;
  }

  const sessionId = resolveSession(req, res);
  const updated = patchState(sessionId, patch);
  res.status(200).json(updated);
});

export default router;
