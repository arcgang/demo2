import { Router, Request, Response } from 'express';
import { buildStructuredError } from '../modules/errorClassification/errorSchema';

const router = Router();

/*
 * Sentinel cart IDs used by error-classification acceptance tests.
 * cart_pay_fail_test  → simulates a PSP card decline (payment_failed)
 * cart_expired_test   → simulates an expired cart (cart_expired)
 * cart_tz_activation  → TZ-market mobile-money payment that succeeds but
 *                        activation is deferred (activation_delayed)
 */
const CART_PAYMENT_FAILED = 'cart_pay_fail_test';
const CART_EXPIRED = 'cart_expired_test';

// Markets where activation is deferred after a successful payment.
const DELAYED_ACTIVATION_MARKETS = new Set(['TZ', 'MZ']);

// POST /api/checkout/payments
router.post('/payments', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const cartId = body.cartId as string | undefined;
  const marketCode = body.marketCode as string | undefined;

  if (!cartId) {
    res.status(422).json(
      buildStructuredError('validation_error', {
        errorCode: 'VALIDATION_ERROR',
        message: 'cartId is required.',
      }),
    );
    return;
  }

  if (cartId === CART_EXPIRED) {
    res.status(410).json(
      buildStructuredError('cart_expired', {
        errorCode: 'CART_EXPIRED',
        message: 'The cart has expired. Please start a new cart.',
      }),
    );
    return;
  }

  if (cartId === CART_PAYMENT_FAILED) {
    res.status(402).json(
      buildStructuredError('payment_failed', {
        errorCode: 'PAYMENT_DECLINED',
        message: 'Payment was declined. Please retry with a different payment method.',
      }),
    );
    return;
  }

  if (marketCode && DELAYED_ACTIVATION_MARKETS.has(marketCode)) {
    res.status(202).json(
      buildStructuredError('activation_delayed', {
        errorCode: 'ACTIVATION_DEFERRED',
        message: 'Payment received. Activation is in progress and may take additional time in this market.',
      }),
    );
    return;
  }

  // Happy path — stub successful payment initiation
  res.status(200).json({
    paymentAttemptId: `pay_${Date.now()}`,
    paymentStatus: 'PENDING_PROVIDER_CONFIRMATION',
    cartId,
    nextAction: 'POLL_STATUS',
  });
});

export default router;
