import { randomBytes } from 'crypto';
import {
  getOrder,
  getActivationStatusForOrder,
  persistActivationStatus,
  persistAuditEvent,
} from './activationStore';
import { getOrderByReference } from '../order/orderStore';
import { emitAuditEvent } from '../consentAudit/consentAndAuditService';

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

function writeLocalAuditEvent(orderId: string, eventType: string, payload: Record<string, unknown>): void {
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

function resolveAuditKey(orderId: string): string {
  const stored = getOrderByReference(orderId);
  return stored ? stored.orderReference : orderId;
}

export async function issueEsim(orderId: string): Promise<IssueResult> {
  const order = getOrder(orderId);

  if (!order) {
    writeLocalAuditEvent(orderId, 'ESIM_ISSUE_ORDER_NOT_FOUND', { orderId });
    return { outcome: 'NOT_FOUND' };
  }

  if (order.paymentStatus !== 'CONFIRMED') {
    writeLocalAuditEvent(orderId, 'ESIM_ISSUE_BLOCKED_PAYMENT', { paymentStatus: order.paymentStatus });
    return { outcome: 'PAYMENT_PENDING' };
  }

  if (order.verificationStatus !== 'COMPLETED') {
    writeLocalAuditEvent(orderId, 'ESIM_ISSUE_BLOCKED_VERIFICATION', { verificationStatus: order.verificationStatus });
    return { outcome: 'VERIFICATION_PENDING' };
  }

  const existing = getActivationStatusForOrder(orderId);
  if (existing) {
    writeLocalAuditEvent(orderId, 'ESIM_ALREADY_ISSUED', { activationCode: existing.activationCode });
    return {
      outcome: 'ALREADY_ISSUED',
      activationCode: existing.activationCode,
      smdpAddress: existing.smdpAddress,
      activationState: existing.activationState,
      orderId,
    };
  }

  const { esimReference, activationCode, smdpAddress } = invokeActivationAdapter(orderId);
  const fromStatus = 'pending';
  const toStatus = 'ESIM_ISSUED';

  persistActivationStatus({
    orderId,
    activationState: toStatus,
    esimReference,
    activationCode,
    smdpAddress,
    updatedAt: new Date().toISOString(),
  });

  writeLocalAuditEvent(orderId, 'ESIM_ISSUED', { esimReference, activationState: toStatus });

  const auditKey = resolveAuditKey(orderId);
  try {
    await emitAuditEvent({
      type: 'activation_status_change',
      orderId: auditKey,
      payload: {
        esim_ref: esimReference,
        from_status: fromStatus,
        to_status: toStatus,
      },
    });
  } catch (err) {
    console.error({ msg: 'emitAuditEvent failed in issueEsim', err, orderId });
    throw err;
  }

  return { outcome: 'ISSUED', activationCode, smdpAddress, activationState: toStatus, orderId };
}

export async function completeActivation(orderId: string): Promise<void> {
  const existing = getActivationStatusForOrder(orderId);
  const fromStatus = existing?.activationState ?? 'ESIM_ISSUED';
  const toStatus = 'ACTIVATION_COMPLETE';
  const esimReference = existing?.esimReference ?? orderId;

  persistActivationStatus({
    orderId,
    activationState: toStatus,
    esimReference,
    activationCode: existing?.activationCode ?? '',
    smdpAddress: existing?.smdpAddress ?? '',
    updatedAt: new Date().toISOString(),
  });

  writeLocalAuditEvent(orderId, 'ACTIVATION_COMPLETE', { esimReference, activationState: toStatus });

  const auditKey = resolveAuditKey(orderId);
  try {
    await emitAuditEvent({
      type: 'activation_status_change',
      orderId: auditKey,
      payload: {
        esim_ref: esimReference,
        from_status: fromStatus,
        to_status: toStatus,
      },
    });
  } catch (err) {
    console.error({ msg: 'emitAuditEvent failed in completeActivation', err, orderId });
    throw err;
  }
}

export async function failActivation(orderId: string): Promise<void> {
  const existing = getActivationStatusForOrder(orderId);
  const fromStatus = existing?.activationState ?? 'ESIM_ISSUED';
  const toStatus = 'ACTIVATION_FAILED';
  const esimReference = existing?.esimReference ?? orderId;

  persistActivationStatus({
    orderId,
    activationState: toStatus,
    esimReference,
    activationCode: existing?.activationCode ?? '',
    smdpAddress: existing?.smdpAddress ?? '',
    updatedAt: new Date().toISOString(),
  });

  writeLocalAuditEvent(orderId, 'ACTIVATION_FAILED', { esimReference, activationState: toStatus });

  const auditKey = resolveAuditKey(orderId);
  try {
    await emitAuditEvent({
      type: 'activation_status_change',
      orderId: auditKey,
      payload: {
        esim_ref: esimReference,
        from_status: fromStatus,
        to_status: toStatus,
      },
    });
  } catch (err) {
    console.error({ msg: 'emitAuditEvent failed in failActivation', err, orderId });
    throw err;
  }
}
