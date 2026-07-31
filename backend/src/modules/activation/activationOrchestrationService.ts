import {
  getOrder,
  getActivationStatusForOrder,
  persistActivationStatus,
  persistAuditEvent,
} from './activationStore';

const SMDP_ADDRESS = 'smdp.vodacom.co.za';

export type IssueResult =
  | { outcome: 'NOT_FOUND' }
  | { outcome: 'PAYMENT_PENDING' }
  | { outcome: 'VERIFICATION_PENDING' }
  | { outcome: 'ALREADY_ISSUED'; activationCode: string; smdpAddress: string; activationState: string; orderId: string }
  | { outcome: 'ISSUED'; activationCode: string; smdpAddress: string; activationState: string; orderId: string };

function randomHex(length: number): string {
  let result = '';
  while (result.length < length) {
    result += Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  }
  return result.slice(0, length).toUpperCase();
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

  if (!order) {
    return { outcome: 'NOT_FOUND' };
  }

  if (order.paymentStatus !== 'CONFIRMED') {
    writeAuditEvent(orderId, 'ESIM_ISSUE_BLOCKED_PAYMENT', { paymentStatus: order.paymentStatus });
    return { outcome: 'PAYMENT_PENDING' };
  }

  if (order.verificationStatus !== 'COMPLETED') {
    writeAuditEvent(orderId, 'ESIM_ISSUE_BLOCKED_VERIFICATION', { verificationStatus: order.verificationStatus });
    return { outcome: 'VERIFICATION_PENDING' };
  }

  const existing = getActivationStatusForOrder(orderId);
  if (existing) {
    return {
      outcome: 'ALREADY_ISSUED',
      activationCode: existing.activationCode!,
      smdpAddress: existing.smdpAddress!,
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
