import { randomBytes } from 'crypto';
import {
  getOrder,
  getActivationStatusForOrder,
  persistActivationStatus,
  persistAuditEvent,
} from './activationStore';
import { getPaymentAttemptByOrderId } from '../payment/paymentStore';

const SMDP_ADDRESS = 'smdp.vodacom.co.za';

export type IssueResult =
  | { outcome: 'NOT_FOUND' }
  | { outcome: 'PAYMENT_PENDING' }
  | { outcome: 'VERIFICATION_PENDING' }
  | { outcome: 'ALREADY_ISSUED'; activationCode: string; smdpAddress: string; activationState: string; orderId: string }
  | { outcome: 'ISSUED'; activationCode: string; smdpAddress: string; activationState: string; orderId: string };

function randomHex(length: number): string {
  return randomBytes(Math.ceil(length / 2)).toString('hex').toUpperCase().slice(0, length);
}

function writeAuditEvent(orderId: string, eventType: string, payload: Record<string, unknown>): void {
  persistAuditEvent({
    auditEventId: randomHex(32),
    orderId,
    eventType,
    eventCategory: 'ACTIVATION',
    actorType: 'SYSTEM',
    occurredAt: new Date().toISOString(),
    payloadJson: payload,
  });
}

function invokeActivationAdapter(_orderId: string): { esimReference: string; activationCode: string; smdpAddress: string } {
  const matchingId = randomHex(32);
  const esimReference = `esim_ref_${matchingId.slice(0, 8)}`;
  return {
    esimReference,
    activationCode: `LPA:1$${SMDP_ADDRESS}$${matchingId}`,
    smdpAddress: SMDP_ADDRESS,
  };
}

export function issueEsim(orderId: string): IssueResult {
  const order = getOrder(orderId);
  const liveAttempt = getPaymentAttemptByOrderId(orderId);

  // Require the order record OR a live payment attempt to exist.
  if (!order && !liveAttempt) {
    writeAuditEvent(orderId, 'ESIM_ISSUE_ORDER_NOT_FOUND', { orderId });
    return { outcome: 'NOT_FOUND' };
  }

  // Live PaymentAttempt takes precedence over the seeded order record.
  const paymentConfirmed = liveAttempt
    ? liveAttempt.status === 'success'
    : order?.paymentStatus === 'CONFIRMED';

  if (!paymentConfirmed) {
    writeAuditEvent(orderId, 'ESIM_ISSUE_BLOCKED_PAYMENT', {
      paymentStatus: liveAttempt ? liveAttempt.status : order?.paymentStatus,
    });
    return { outcome: 'PAYMENT_PENDING' };
  }

  const verificationStatus = order?.verificationStatus ?? 'PENDING';
  if (verificationStatus !== 'COMPLETED') {
    writeAuditEvent(orderId, 'ESIM_ISSUE_BLOCKED_VERIFICATION', { verificationStatus });
    return { outcome: 'VERIFICATION_PENDING' };
  }

  const existing = getActivationStatusForOrder(orderId);
  if (existing) {
    writeAuditEvent(orderId, 'ESIM_ALREADY_ISSUED', { activationCode: existing.activationCode });
    return {
      outcome: 'ALREADY_ISSUED',
      activationCode: existing.activationCode,
      smdpAddress: existing.smdpAddress,
      activationState: existing.activationState,
      orderId,
    };
  }

  const { esimReference, activationCode, smdpAddress } = invokeActivationAdapter(orderId);

  persistActivationStatus({
    orderId,
    activationState: 'ESIM_ISSUED',
    esimReference,
    activationCode,
    smdpAddress,
    updatedAt: new Date().toISOString(),
  });

  writeAuditEvent(orderId, 'ESIM_ISSUED', { esimReference, activationState: 'ESIM_ISSUED' });

  return { outcome: 'ISSUED', activationCode, smdpAddress, activationState: 'ESIM_ISSUED', orderId };
}
