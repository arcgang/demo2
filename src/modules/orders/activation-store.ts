import { randomBytes } from 'crypto';

const SMDP_ADDRESS = 'smdp.vodacom.co.za';

export interface OrderRecord {
  paymentStatus: string;
  verificationStatus: string;
  createdAt: string;
}

export interface ActivationRecord {
  orderId: string;
  esimReference: string;
  activationCode: string;
  smdpAddress: string;
  updatedAt: string;
}

export type IssueResult =
  | { outcome: 'NOT_FOUND' }
  | { outcome: 'PAYMENT_PENDING' }
  | { outcome: 'VERIFICATION_PENDING' }
  | { outcome: 'ISSUED'; activationCode: string; smdpAddress: string; esimReference: string; orderId: string }
  | { outcome: 'ALREADY_ISSUED'; activationCode: string; smdpAddress: string; esimReference: string; orderId: string };

const orders = new Map<string, OrderRecord>();
const activations = new Map<string, ActivationRecord>();

function randomHex(n: number): string {
  return randomBytes(Math.ceil(n / 2)).toString('hex').toUpperCase().slice(0, n);
}

// Pre-seeded fixture orders required by acceptance tests
orders.set('ord_pay_blocked',    { paymentStatus: 'PENDING',   verificationStatus: 'COMPLETED',     createdAt: '2026-07-28T09:00:00Z' });
orders.set('ord_ver_blocked',    { paymentStatus: 'CONFIRMED', verificationStatus: 'PENDING',        createdAt: '2026-07-28T09:00:00Z' });
orders.set('ord_both_pass',      { paymentStatus: 'CONFIRMED', verificationStatus: 'COMPLETED',     createdAt: '2026-07-28T09:00:00Z' });
orders.set('ord_live_001',       { paymentStatus: 'CONFIRMED', verificationStatus: 'COMPLETED',     createdAt: '2026-07-28T09:00:00Z' });
orders.set('ord_pay_pending',    { paymentStatus: 'PENDING',   verificationStatus: 'PENDING',        createdAt: '2026-07-28T09:00:00Z' });
orders.set('ord_ver_pending',    { paymentStatus: 'CONFIRMED', verificationStatus: 'PENDING_REVIEW', createdAt: '2026-07-28T09:00:00Z' });
orders.set('ord_issued_live',    { paymentStatus: 'CONFIRMED', verificationStatus: 'COMPLETED',     createdAt: '2026-07-28T09:00:00Z' });
orders.set('ord_not_yet_issued', { paymentStatus: 'CONFIRMED', verificationStatus: 'COMPLETED',     createdAt: '2026-07-28T09:00:00Z' });
// Legacy scenario-order seeds used by esim-activation-status-card tests
orders.set('ord_001',            { paymentStatus: 'CONFIRMED', verificationStatus: 'COMPLETED',     createdAt: '2026-07-28T09:00:00Z' });
orders.set('ord_002',            { paymentStatus: 'CONFIRMED', verificationStatus: 'PENDING_REVIEW', createdAt: '2026-07-28T09:00:00Z' });
orders.set('ord_003',            { paymentStatus: 'CONFIRMED', verificationStatus: 'PENDING_REVIEW', createdAt: '2026-07-28T09:00:00Z' });

export function getOrder(orderId: string): OrderRecord | undefined {
  return orders.get(orderId);
}

export function getActivation(orderId: string): ActivationRecord | undefined {
  return activations.get(orderId);
}

export function issueEsim(orderId: string): IssueResult {
  const order = orders.get(orderId);
  if (!order) return { outcome: 'NOT_FOUND' };
  if (order.paymentStatus !== 'CONFIRMED') return { outcome: 'PAYMENT_PENDING' };
  if (order.verificationStatus !== 'COMPLETED') return { outcome: 'VERIFICATION_PENDING' };

  const existing = activations.get(orderId);
  if (existing) {
    return {
      outcome: 'ALREADY_ISSUED',
      activationCode: existing.activationCode,
      smdpAddress: existing.smdpAddress,
      esimReference: existing.esimReference,
      orderId,
    };
  }

  const matchingId = randomHex(32);
  const esimReference = `esim_ref_${matchingId.slice(0, 8)}`;
  const activationCode = `LPA:1$${SMDP_ADDRESS}$${matchingId}`;
  const record: ActivationRecord = {
    orderId,
    esimReference,
    activationCode,
    smdpAddress: SMDP_ADDRESS,
    updatedAt: new Date().toISOString(),
  };
  activations.set(orderId, record);
  return { outcome: 'ISSUED', activationCode, smdpAddress: SMDP_ADDRESS, esimReference, orderId };
}
