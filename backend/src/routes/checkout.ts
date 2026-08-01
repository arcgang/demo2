import { Router, Request, Response } from 'express';
import { createOrder, validateCreateOrderInput } from '../modules/order/orderService';
import { insertAuditEvent, insertConsentRecord } from '../modules/consentAudit/consentAuditStore';

const router = Router();

router.post('/place-order', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  const consent = body.consent as { terms?: boolean; marketing?: boolean } | undefined;
  if (!consent || consent.terms !== true) {
    res.status(422).json({
      errorCode: 'CONSENT_REQUIRED',
      message: 'Acceptance of terms is required to place an order.',
      errors: [{ field: 'consent.terms', message: 'Terms acceptance is required.' }],
    });
    return;
  }

  const fieldErrors = validateCreateOrderInput(body);
  if (fieldErrors.length > 0) {
    res.status(422).json({
      errorCode: 'VALIDATION_ERROR',
      message: 'Required fields are missing or invalid.',
      errors: fieldErrors,
    });
    return;
  }

  const confirmation = createOrder({
    cartId: body.cartId as string,
    paymentAttemptId: body.paymentAttemptId as string,
    paymentStatus: body.paymentStatus as string,
    verificationCaseId: body.verificationCaseId as string | undefined,
    verificationStatus: body.verificationStatus as string | undefined,
    customerId: body.customerId as string | undefined,
    lineItems: body.lineItems as Array<{ name: string; qty: number; unitPrice: number }>,
    onceOffTotal: body.onceOffTotal as number,
    monthlyTotal: body.monthlyTotal as number,
  });

  const marketingAccepted = typeof consent.marketing === 'boolean' ? consent.marketing : false;
  const sessionId = (req.headers['x-session-token'] as string | undefined) ?? 'checkout-session';

  insertConsentRecord({
    orderId: confirmation.orderReference,
    sessionId,
    purpose: 'terms',
    accepted: true,
    ipAddress: req.ip,
  });

  insertConsentRecord({
    orderId: confirmation.orderReference,
    sessionId,
    purpose: 'marketing',
    accepted: marketingAccepted,
    ipAddress: req.ip,
  });

  insertAuditEvent({
    eventType: 'consent_capture',
    orderId: confirmation.orderReference,
    payload: { purpose: 'terms', accepted: true },
  });

  insertAuditEvent({
    eventType: 'consent_capture',
    orderId: confirmation.orderReference,
    payload: { purpose: 'marketing', accepted: marketingAccepted },
  });

  res.status(201).json({
    order_ref: confirmation.orderReference,
    orderReference: confirmation.orderReference,
    orderDate: confirmation.orderDate,
    lineItems: confirmation.lineItems,
    onceOffTotal: confirmation.onceOffTotal,
    monthlyTotal: confirmation.monthlyTotal,
    paymentStatus: confirmation.paymentStatus,
    nextSteps: confirmation.nextSteps,
  });
});

export default router;
