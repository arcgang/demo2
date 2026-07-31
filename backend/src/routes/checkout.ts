import { Router, Request, Response } from 'express';
import { getPaymentMethodsForMarket } from '../modules/payment/marketPaymentConfig';
import { containsRawPan } from '../modules/payment/panGuard';
import { initiatePayment } from '../modules/payment/paymentOrchestrationService';
import { getPaymentAttempt, updatePaymentAttemptStatus } from '../modules/payment/paymentStore';

const router = Router();

const CALLBACK_SECRET = process.env.PAYMENT_CALLBACK_SECRET ?? 'test-callback-secret';

// GET /api/checkout/payment-methods?market={code}
router.get('/payment-methods', (req: Request, res: Response) => {
  const market = req.query.market as string | undefined;

  if (!market) {
    res.status(400).json({ errorCode: 'MISSING_MARKET', message: 'Query parameter "market" is required.' });
    return;
  }

  const methods = getPaymentMethodsForMarket(market);
  if (methods === null) {
    res.status(404).json({ errorCode: 'MARKET_NOT_FOUND', message: `Market "${market}" is not configured.` });
    return;
  }

  res.status(200).json(methods);
});

// POST /api/checkout/initiate-payment
router.post('/initiate-payment', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  const { orderId, method, token, walletRef } = body;

  if (!orderId || typeof orderId !== 'string') {
    res.status(422).json({ errorCode: 'MISSING_ORDER_ID', message: 'orderId is required.' });
    return;
  }

  if (!method || (method !== 'card' && method !== 'mobile_money')) {
    res.status(422).json({ errorCode: 'INVALID_METHOD', message: 'method must be "card" or "mobile_money".' });
    return;
  }

  if (containsRawPan(body)) {
    res.status(400).json({ errorCode: 'RAW_PAN_REJECTED', message: 'Raw card numbers are not accepted. Use a PSP-issued token.' });
    return;
  }

  const result = initiatePayment({
    orderId,
    method: method as 'card' | 'mobile_money',
    token: typeof token === 'string' ? token : undefined,
    walletRef: typeof walletRef === 'string' ? walletRef : undefined,
  });

  res.status(201).json({
    paymentAttemptId: result.paymentAttemptId,
    method: result.method,
    status: result.status,
  });
});

// POST /api/checkout/payment-callback
router.post('/payment-callback', (req: Request, res: Response) => {
  const secret = req.headers['x-callback-secret'];
  if (!secret || secret !== CALLBACK_SECRET) {
    res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'Invalid or missing callback secret.' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const { paymentAttemptId, providerReference, status } = body;

  if (!paymentAttemptId || typeof paymentAttemptId !== 'string') {
    res.status(422).json({ errorCode: 'MISSING_PAYMENT_ATTEMPT_ID', message: 'paymentAttemptId is required.' });
    return;
  }

  if (!providerReference || typeof providerReference !== 'string') {
    res.status(422).json({ errorCode: 'MISSING_PROVIDER_REFERENCE', message: 'providerReference is required.' });
    return;
  }

  const VALID_STATUSES = ['SUCCESS', 'FAILED', 'PENDING'];
  if (!status || typeof status !== 'string' || !VALID_STATUSES.includes(status)) {
    res.status(422).json({ errorCode: 'INVALID_STATUS', message: 'status must be SUCCESS, FAILED, or PENDING.' });
    return;
  }

  const existing = getPaymentAttempt(paymentAttemptId);
  if (!existing) {
    res.status(404).json({ errorCode: 'PAYMENT_ATTEMPT_NOT_FOUND', message: `Payment attempt "${paymentAttemptId}" not found.` });
    return;
  }

  const updated = updatePaymentAttemptStatus(paymentAttemptId, status);

  res.status(200).json({
    paymentAttemptId: updated!.paymentAttemptId,
    status: updated!.status,
  });
});

export default router;
