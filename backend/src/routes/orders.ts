import { Router, Request, Response } from 'express';
import { issueEsim } from '../modules/activation/activationOrchestrationService';
import { validateCreateOrderInput, createOrder } from '../modules/order/orderService';
import { getOrderByReference, getAllOrders } from '../modules/order/orderStore';
import { getJourneyAuditTrail } from '../modules/consentAudit/consentAndAuditService';
import { hasTimelineEvents, getTimelineEvents, seedTimelineEvents } from '../modules/statusTimeline/timelineStore';
import { buildTimeline, computeNextPollMs, startPolling, type TimelineInput } from '../modules/statusTimeline/timelineService';

const router = Router();

// Start background polling loop: every 15 s re-derive timeline from live order state.
startPolling(() => {
  return getAllOrders().map((o) => ({
    orderId: o.orderId,
    paymentStatus: o.paymentStatus ?? null,
    verificationStatus: o.verificationStatus ?? null,
    activationStatus: o.activationState ?? null,
  }));
});

router.post('/', (req: Request, res: Response) => {
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
    consents: body.consents as Array<{ purpose: string; granted: boolean }> | undefined,
  });

  res.status(201).json(confirmation);
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

// GET /api/orders/:id/status — unified timeline endpoint (also accessible as /status-timeline for backwards compat)
function handleStatusTimeline(req: Request, res: Response): void {
  const { id } = req.params;

  // Look up the order to derive live timeline from stored state
  const order = getOrderByReference(id);

  if (order) {
    // Re-derive timeline from live order state so it always reflects current DB state
    const paymentToken = (() => {
      const s = order.paymentStatus?.toLowerCase();
      if (s === 'confirmed' || s === 'payment_confirmed') return 'payment_confirmed';
      if (s === 'failed' || s === 'payment_failed') return 'payment_failed';
      return 'payment_pending';
    })();

    const verificationToken = (() => {
      const s = order.verificationStatus?.toLowerCase();
      if (!s) return null;
      if (s === 'completed' || s === 'verified' || s === 'verification_complete') return 'verification_complete';
      if (s === 'failed' || s === 'verification_failed') return 'verification_failed';
      return 'verification_pending';
    })();

    const activationToken = (() => {
      const s = order.activationState?.toLowerCase();
      if (!s || s === 'pending') return null;
      if (s === 'esim_issued') return 'esim_issued';
      if (s === 'activation_complete' || s === 'completed') return 'activation_complete';
      if (s === 'activation_failed' || s === 'failed') return 'activation_failed';
      if (s === 'fulfillment_in_progress') return 'fulfillment_in_progress';
      return 'activation_pending';
    })();

    const input: TimelineInput = {
      orderId: id,
      paymentStatus: paymentToken,
      verificationStatus: verificationToken,
      activationStatus: activationToken,
      timestamps: { order_placed: order.createdAt },
    };

    const timeline = buildTimeline(input);
    // Persist updated timeline back to both in-memory store and DB record
    seedTimelineEvents(id, timeline);

    const nextPollMs = computeNextPollMs(timeline);
    res.status(200).json({ orderId: id, timeline, nextPollMs });
    return;
  }

  // Fall back to in-memory timeline store (used by tests that seed directly)
  if (!hasTimelineEvents(id)) {
    res.status(404).json({
      errorCode: 'ORDER_NOT_FOUND',
      message: `No timeline events found for order "${id}".`,
    });
    return;
  }

  const timeline = getTimelineEvents(id);
  const nextPollMs = computeNextPollMs(timeline);
  res.status(200).json({ orderId: id, timeline, nextPollMs });
}

router.get('/:id/status', handleStatusTimeline);
router.get('/:id/status-timeline', handleStatusTimeline);

export default router;
