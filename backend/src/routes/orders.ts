import { Router, Request, Response } from 'express';
import { buildStatusResponse } from '../modules/activation/statusScenarios';
import { issueEsim } from '../modules/activation/activationOrchestrationService';
import { validateCreateOrderInput, createOrder, CreateOrderInput } from '../modules/order/orderService';
import { getOrderByReference } from '../modules/order/orderStore';
import { getJourneyAuditTrail } from '../modules/consentAudit/consentAndAuditService';
import { withTimeout, isTimeoutError, getSlowAdapterMs } from '../modules/shared/adapterTimeout';

const router = Router();

const ADAPTER_TIMEOUT_MS = 1500;

function createOrderAsync(input: CreateOrderInput) {
  const delay = getSlowAdapterMs();
  return new Promise<ReturnType<typeof createOrder>>((resolve) => {
    setTimeout(() => {
      resolve(createOrder(input));
    }, delay);
  });
}

router.post('/', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  const errors = validateCreateOrderInput(body);
  if (errors.length > 0) {
    res.status(422).json({
      errorCode: 'VALIDATION_ERROR',
      message: 'Required fields are missing or invalid.',
      errors,
    });
    return;
  }

  const input: CreateOrderInput = {
    cartId: body.cartId as string,
    paymentAttemptId: body.paymentAttemptId as string,
    paymentStatus: body.paymentStatus as string,
    verificationCaseId: body.verificationCaseId as string | undefined,
    verificationStatus: body.verificationStatus as string | undefined,
    customerId: body.customerId as string | undefined,
    lineItems: body.lineItems as Array<{ name: string; qty: number; unitPrice: number }>,
    onceOffTotal: body.onceOffTotal as number,
    monthlyTotal: body.monthlyTotal as number,
    consents: body.consents as Array<{ purpose: string; granted: boolean }> | undefined,
  };

  try {
    const confirmation = await withTimeout(() => createOrderAsync(input), ADAPTER_TIMEOUT_MS);
    res.status(201).json(confirmation);
  } catch (err) {
    if (isTimeoutError(err)) {
      res.status(200).json({
        status: 'pending',
        cartId: input.cartId,
        correlationId: input.paymentAttemptId,
        message: 'Order processing is taking longer than expected. Retrieve the order using the correlationId via GET /api/orders/:ref once processing completes.',
      });
      return;
    }
    throw err;
  }
});

router.post('/:id/esim/issue', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = issueEsim(id);

  switch (result.outcome) {
    case 'NOT_FOUND':
      res.status(404).json({ errorCode: 'ORDER_NOT_FOUND', message: 'Order not found.' });
      return;
    case 'PAYMENT_PENDING':
      res.status(403).json({ errorCode: 'PAYMENT_PENDING', message: 'Payment has not been confirmed. eSIM issuance requires a confirmed payment.' });
      return;
    case 'VERIFICATION_PENDING':
      res.status(403).json({ errorCode: 'VERIFICATION_PENDING', message: 'Identity verification has not been completed. eSIM issuance requires passed KYC/RICA verification.' });
      return;
    case 'ALREADY_ISSUED':
      res.status(200).json({
        orderId: result.orderId,
        activationState: result.activationState,
        activationCode: result.activationCode,
        smdpAddress: result.smdpAddress,
      });
      return;
    case 'ISSUED':
      res.status(200).json({
        orderId: result.orderId,
        activationState: result.activationState,
        activationCode: result.activationCode,
        smdpAddress: result.smdpAddress,
      });
      return;
  }
});

router.get('/:ref/audit-trail', async (req: Request, res: Response) => {
  const sessionToken = req.headers['x-session-token'];
  const operatorToken = req.headers['x-operator-token'];
  if (!sessionToken && !operatorToken) {
    res.status(401).json({ errorCode: 'UNAUTHENTICATED', message: 'Authentication required.' });
    return;
  }

  const { ref } = req.params;
  const order = getOrderByReference(ref);
  if (!order) {
    res.status(404).json({ errorCode: 'ORDER_NOT_FOUND', message: `No order found for reference "${ref}".` });
    return;
  }

  const events = await getJourneyAuditTrail(order.orderReference);
  res.status(200).json({
    orderId: order.orderReference,
    events: events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      occurredAt: e.occurredAt,
      payload: e.payload,
      orderId: e.orderId,
      journeyRef: e.journeyRef,
      actorRef: e.actorRef,
    })),
  });
});

router.get('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const scenario = req.query.scenario as string | undefined;

  if (!scenario) {
    res.status(404).json({ errorCode: 'SCENARIO_REQUIRED', message: 'Query parameter ?scenario is required for stub responses.' });
    return;
  }

  const response = buildStatusResponse(id, scenario);
  if (!response) {
    res.status(404).json({ errorCode: 'SCENARIO_NOT_FOUND', message: `Unknown scenario: ${scenario}` });
    return;
  }

  res.status(200).json(response);
});

export default router;
