import { Router, Request, Response } from 'express';
import { checkEligibility } from '../modules/upgrade/eligibilityAdapter';
import { getFinancingQuotes } from '../modules/upgrade/financingAdapter';
import { getTradeInQuote, VALID_CONDITIONS } from '../modules/upgrade/tradeInAdapter';
import { resolveSession, patchState, UpgradeSessionState } from '../modules/upgrade/sessionStore';
import { withTimeout, isTimeoutError } from '../modules/shared/adapterTimeout';

const router = Router();

const ADAPTER_TIMEOUT_MS = 1500;

// ---------------------------------------------------------------------------
// POST /api/upgrade/eligibility
// ---------------------------------------------------------------------------

router.post('/eligibility', async (req: Request, res: Response) => {
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

  try {
    const result = await withTimeout(
      () => checkEligibility(
        body.customerId as string,
        body.lineId as string,
        body.marketCode as string,
      ),
      ADAPTER_TIMEOUT_MS,
    );
    res.status(200).json(result);
  } catch (err) {
    if (isTimeoutError(err)) {
      res.status(200).json({
        status: 'pending',
        partialData: {
          upgradeWindowOpen: null,
          currentPlan: null,
          availableDevices: [],
        },
      });
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// GET /api/upgrade/financing
// ---------------------------------------------------------------------------

router.get('/financing', async (_req: Request, res: Response) => {
  try {
    const quotes = await withTimeout(() => getFinancingQuotes(), ADAPTER_TIMEOUT_MS);
    res.status(200).json(quotes);
  } catch (err) {
    if (isTimeoutError(err)) {
      res.status(200).json({ status: 'pending', options: [] });
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// POST /api/upgrade/trade-in/valuation
// ---------------------------------------------------------------------------

router.post('/trade-in/valuation', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const errors: Array<{ field: string; message: string }> = [];

  for (const field of ['brand', 'model'] as const) {
    const v = body[field];
    if (v === undefined || v === null || v === '') {
      errors.push({ field, message: `${field} is required and must not be empty.` });
    }
  }

  const condition = body.condition;
  if (condition === undefined || condition === null || condition === '') {
    errors.push({ field: 'condition', message: 'condition is required and must not be empty.' });
  } else if (!VALID_CONDITIONS.includes(condition as string)) {
    errors.push({ field: 'condition', message: `condition must be one of: ${VALID_CONDITIONS.join(', ')}.` });
  }

  const storage = body.storage;
  if (storage === undefined || storage === null) {
    errors.push({ field: 'storage', message: 'storage is required and must not be empty.' });
  } else if (typeof storage !== 'number' || !Number.isFinite(storage) || storage < 0) {
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
    condition as string,
  );

  if ('errorCode' in quote) {
    res.status(422).json(quote);
    return;
  }

  res.status(200).json(quote);
});

// ---------------------------------------------------------------------------
// GET /api/upgrade/session
// ---------------------------------------------------------------------------

router.get('/session', (req: Request, res: Response) => {
  const { state } = resolveSession(req, res);
  res.status(200).json(state);
});

// ---------------------------------------------------------------------------
// PUT /api/upgrade/session
// ---------------------------------------------------------------------------

router.put('/session', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const ALLOWED_KEYS: Array<keyof UpgradeSessionState> = ['eligibility', 'financing', 'tradeIn'];
  const patch: Partial<UpgradeSessionState> = {};
  const errors: Array<{ field: string; message: string }> = [];

  for (const key of ALLOWED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      const v = body[key];
      if (Array.isArray(v)) {
        errors.push({ field: key, message: `${key} must be a plain object or null, not an array.` });
      } else if (v !== null && typeof v !== 'object') {
        errors.push({ field: key, message: `${key} must be a plain object or null.` });
      } else {
        patch[key] = v as Record<string, unknown> | null;
      }
    }
  }

  if (errors.length > 0) {
    res.status(422).json({ errorCode: 'VALIDATION_ERROR', errors });
    return;
  }

  const hasKnownKey = ALLOWED_KEYS.some((k) => Object.prototype.hasOwnProperty.call(body, k));

  if (!hasKnownKey) {
    res.status(422).json({ errorCode: 'VALIDATION_ERROR', message: 'Body must contain at least one of: eligibility, financing, tradeIn.' });
    return;
  }

  const { sessionId } = resolveSession(req, res);
  const updated = patchState(sessionId, patch);
  res.status(200).json(updated);
});

export default router;
