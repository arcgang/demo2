import { randomUUID } from 'crypto';
import {
  generateOrderReference,
  persistOrder,
  persistOrderAuditEvent,
  persistTimelineEventsForOrder,
} from './orderStore';
import { seedOrder } from '../activation/activationStore';
import { insertAuditEvent } from '../consentAudit/consentAuditStore';
import { buildTimeline, type TimelineInput } from '../statusTimeline/timelineService';
import { seedTimelineEvents } from '../statusTimeline/timelineStore';

export interface LineItemInput {
  name: string;
  qty: number;
  unitPrice: number;
}

export interface CreateOrderInput {
  cartId: string;
  paymentAttemptId: string;
  paymentStatus: string;
  verificationCaseId?: string;
  verificationStatus?: string;
  customerId?: string;
  lineItems: LineItemInput[];
  onceOffTotal: number;
  monthlyTotal: number;
  consents?: Array<{ purpose: string; granted: boolean }>;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface OrderConfirmation {
  orderReference: string;
  orderDate: string;
  lineItems: LineItemInput[];
  onceOffTotal: number;
  monthlyTotal: number;
  paymentStatus: string;
  nextSteps: Array<{ step: string; status: string; estimatedMinutes: number }>;
}

const REQUIRED_FIELDS: Array<keyof CreateOrderInput> = [
  'cartId',
  'paymentAttemptId',
  'paymentStatus',
  'lineItems',
];

export function validateCreateOrderInput(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (body[field] === undefined || body[field] === null) {
      errors.push({ field, message: `${field} is required` });
    }
  }

  if (!errors.some((e) => e.field === 'lineItems')) {
    const items = body.lineItems;
    if (!Array.isArray(items) || items.length === 0) {
      errors.push({ field: 'lineItems', message: 'lineItems must be a non-empty array' });
    }
  }

  return errors;
}

export function createOrder(input: CreateOrderInput): OrderConfirmation {
  const orderId = randomUUID();
  const orderReference = generateOrderReference();
  const createdAt = new Date().toISOString();

  // Map incoming paymentStatus to state-machine token
  const paymentStatusToken = (() => {
    const s = input.paymentStatus?.toLowerCase();
    if (s === 'confirmed' || s === 'payment_confirmed') return 'payment_confirmed';
    if (s === 'failed' || s === 'payment_failed') return 'payment_failed';
    return 'payment_pending';
  })();

  const verificationStatusToken = (() => {
    const s = input.verificationStatus?.toLowerCase();
    if (s === 'completed' || s === 'verified' || s === 'verification_complete') return 'verification_complete';
    if (s === 'failed' || s === 'verification_failed') return 'verification_failed';
    return null;
  })();

  // Build and persist initial timeline
  const timelineInput: TimelineInput = {
    orderId,
    paymentStatus: paymentStatusToken,
    verificationStatus: verificationStatusToken,
    activationStatus: null,
    timestamps: {
      order_placed: createdAt,
      ...(paymentStatusToken === 'payment_confirmed' ? { payment_confirmed: createdAt } : {}),
      ...(paymentStatusToken === 'payment_pending' ? { payment_pending: createdAt } : {}),
      ...(paymentStatusToken === 'payment_failed' ? { payment_failed: createdAt } : {}),
    },
  };
  const initialTimeline = buildTimeline(timelineInput);

  // Persist to in-memory timeline store (polled by background loop & served on GET /status)
  seedTimelineEvents(orderId, initialTimeline);

  persistOrder({
    orderId,
    orderReference,
    cartId: input.cartId,
    paymentAttemptId: input.paymentAttemptId,
    paymentStatus: input.paymentStatus,
    verificationCaseId: input.verificationCaseId,
    verificationStatus: input.verificationStatus,
    customerId: input.customerId,
    lineItems: input.lineItems,
    onceOffTotal: input.onceOffTotal,
    monthlyTotal: input.monthlyTotal,
    activationState: 'pending',
    createdAt,
    timelineEvents: initialTimeline,
  });

  // Keep DB record in sync after persist (so timelineEvents is stored on the row)
  persistTimelineEventsForOrder(orderId, initialTimeline);

  // Register with activation store so eSIM issuance gating works
  seedOrder(orderId, {
    paymentStatus: input.paymentStatus,
    verificationStatus: input.verificationStatus ?? 'PENDING',
  });

  persistOrderAuditEvent({
    auditEventId: randomUUID(),
    orderId,
    eventType: 'ORDER_CREATED',
    eventCategory: 'ORDER',
    actorType: 'CUSTOMER',
    occurredAt: createdAt,
    payloadJson: {
      orderReference,
      cartId: input.cartId,
      paymentAttemptId: input.paymentAttemptId,
      paymentStatus: input.paymentStatus,
    },
  });

  // Emit into ConsentAuditModule so the audit-trail endpoint can serve it
  insertAuditEvent({
    eventType: 'order_created',
    orderId: orderReference,
    actorRef: input.customerId,
    payload: {
      orderId,
      orderReference,
      cartId: input.cartId,
      paymentStatus: input.paymentStatus,
    },
  });

  return {
    orderReference,
    orderDate: createdAt,
    lineItems: input.lineItems,
    onceOffTotal: input.onceOffTotal,
    monthlyTotal: input.monthlyTotal,
    paymentStatus: input.paymentStatus,
    nextSteps: [
      { step: 'eSIM issuance', status: 'pending', estimatedMinutes: 5 },
      { step: 'activation', status: 'pending', estimatedMinutes: 10 },
    ],
  };
}
