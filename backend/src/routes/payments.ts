import { Router, Request, Response } from 'express';
import { initiatePayment, handleCallback } from '../modules/payment/mobileMoneyAdapter';
import { getPaymentAttemptById } from '../modules/payment/paymentStore';

const router = Router();

router.post('/initiate', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const { orderId, method, msisdn, amount } = body;

  const errors: Array<{ field: string; message: string }> = [];
  if (!orderId) errors.push({ field: 'orderId', message: 'orderId is required.' });
  if (!method) errors.push({ field: 'method', message: 'method is required.' });
  if (!msisdn) errors.push({ field: 'msisdn', message: 'msisdn is required.' });
  if (typeof amount !== 'number' || amount <= 0) errors.push({ field: 'amount', message: 'amount must be a positive number.' });

  if (errors.length > 0) {
    res.status(422).json({ errorCode: 'VALIDATION_ERROR', errors });
    return;
  }

  if (method !== 'mobile_money' && method !== 'card') {
    res.status(422).json({
      errorCode: 'VALIDATION_ERROR',
      errors: [{ field: 'method', message: 'method must be "mobile_money" or "card".' }],
    });
    return;
  }

  if (method === 'card') {
    res.status(501).json({
      errorCode: 'NOT_IMPLEMENTED',
      message: 'Card payment is not yet implemented. Use mobile_money.',
    });
    return;
  }

  const result = initiatePayment(orderId as string, amount as number, msisdn as string);

  res.status(201).json({
    paymentAttemptId: result.paymentAttemptId,
    status: 'awaiting_customer_action',
    instructions: result.instructions,
    actionUrl: result.actionUrl,
  });
});

router.get('/:paymentAttemptId/status', (req: Request, res: Response) => {
  const { paymentAttemptId } = req.params;
  const attempt = getPaymentAttemptById(paymentAttemptId);

  if (!attempt) {
    res.status(404).json({ errorCode: 'PAYMENT_ATTEMPT_NOT_FOUND', message: 'Payment attempt not found.' });
    return;
  }

  const updatedAt = attempt.resolvedAt ?? attempt.initiatedAt;
  res.status(200).json({ status: attempt.status, updatedAt });
});

router.post('/mobile-money/simulate-callback', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const { providerReference, outcome } = body;

  if (!providerReference || !outcome) {
    res.status(422).json({
      errorCode: 'VALIDATION_ERROR',
      message: 'providerReference and outcome are required.',
    });
    return;
  }

  const result = handleCallback(providerReference as string, outcome as string);

  switch (result.outcome) {
    case 'INVALID_OUTCOME':
      res.status(422).json({
        errorCode: 'INVALID_OUTCOME',
        message: 'outcome must be "success" or "failed".',
      });
      return;

    case 'NOT_FOUND':
      res.status(404).json({
        errorCode: 'PROVIDER_REFERENCE_NOT_FOUND',
        message: 'No payment attempt found for the given providerReference.',
      });
      return;

    case 'TERMINAL_CONFLICT':
      res.status(409).json({
        errorCode: 'TERMINAL_STATE_CONFLICT',
        message: `Payment attempt is already in terminal state "${result.currentStatus}" and cannot be updated.`,
      });
      return;

    case 'UPDATED':
      res.status(200).json({
        paymentAttemptId: result.paymentAttemptId,
        status: result.status,
        resolvedAt: result.resolvedAt,
      });
      return;
  }
});

export default router;
