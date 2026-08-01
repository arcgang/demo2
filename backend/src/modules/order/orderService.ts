import { randomUUID } from 'crypto';
import {
  generateOrderReference,
  persistOrder,
  persistOrderAuditEvent,
} from './orderStore';
import { seedOrder } from '../activation/activationStore';
import { emitAuditEvent } from '../consentAudit/consentAndAuditService';

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

export async function createOrder(input: CreateOrderInput): Promise<OrderConfirmation> {
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

  try {
    await emitAuditEvent({
      type: 'order_created',
      orderId: orderReference,
      actorRef: input.customerId,
      payload: {
        order_ref: orderReference,
        cart_id: input.cartId,
        line_item_count: input.lineItems.length,
      },
    });
  } catch (err) {
    console.error({ msg: 'emitAuditEvent failed in createOrder', err, orderReference });
    throw err;
  }

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
