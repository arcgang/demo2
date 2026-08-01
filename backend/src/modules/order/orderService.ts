import { randomUUID } from 'crypto';
import {
  generateOrderReference,
  persistOrder,
  persistOrderAuditEvent,
  getOrderByPaymentAttemptId,
} from './orderStore';
import { seedOrder } from '../activation/activationStore';
import { insertAuditEvent } from '../consentAudit/consentAuditStore';

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
  // Idempotency: if this paymentAttemptId already has an order (e.g. a retry after a pending timeout),
  // return the existing confirmation rather than creating a duplicate.
  const existing = getOrderByPaymentAttemptId(input.paymentAttemptId);
  if (existing) {
    return {
      orderReference: existing.orderReference,
      orderDate: existing.createdAt,
      lineItems: existing.lineItems,
      onceOffTotal: existing.onceOffTotal,
      monthlyTotal: existing.monthlyTotal,
      paymentStatus: existing.paymentStatus,
      nextSteps: [
        { step: 'eSIM issuance', status: 'pending', estimatedMinutes: 5 },
        { step: 'activation', status: 'pending', estimatedMinutes: 10 },
      ],
    };
  }

  const orderId = randomUUID();
  const orderReference = generateOrderReference();
  const createdAt = new Date().toISOString();

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
  });

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
