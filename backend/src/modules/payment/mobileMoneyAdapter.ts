import { randomBytes } from 'crypto';
import {
  PaymentAttempt,
  persistPaymentAttempt,
  getPaymentAttemptByProviderRef,
  updatePaymentAttempt,
} from './paymentStore';

function randomHex(length: number): string {
  return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

const TERMINAL_STATUSES = new Set<string>(['success', 'failed', 'cancelled']);

export interface InitiateResult {
  paymentAttemptId: string;
  providerReference: string;
  actionUrl: string;
  instructions: string;
}

export function initiatePayment(
  orderId: string,
  msisdn: string,
): InitiateResult {
  const id = `pay_${randomHex(12)}`;
  const providerReference = `mpesa_tx_${randomHex(16)}`;
  const actionUrl = `https://pay.mpesa.vodacom.co.za/confirm?ref=${providerReference}`;
  const instructions = `Approve the payment request sent to ${msisdn} on your M-Pesa app.`;

  const attempt: PaymentAttempt = {
    id,
    orderId,
    method: 'mobile_money',
    provider: 'mpesa',
    status: 'awaiting_customer_action',
    providerReference,
    initiatedAt: new Date().toISOString(),
    resolvedAt: null,
  };

  persistPaymentAttempt(attempt);

  return { paymentAttemptId: id, providerReference, actionUrl, instructions };
}

export type CallbackResult =
  | { outcome: 'NOT_FOUND' }
  | { outcome: 'INVALID_OUTCOME' }
  | { outcome: 'TERMINAL_CONFLICT'; currentStatus: string }
  | { outcome: 'UPDATED'; paymentAttemptId: string; status: string; resolvedAt: string };

export function handleCallback(
  providerReference: string,
  outcome: string,
): CallbackResult {
  const VALID_OUTCOMES = new Set(['success', 'failed']);

  const attempt = getPaymentAttemptByProviderRef(providerReference);
  if (!attempt) {
    if (!VALID_OUTCOMES.has(outcome)) {
      return { outcome: 'INVALID_OUTCOME' };
    }
    return { outcome: 'NOT_FOUND' };
  }

  if (TERMINAL_STATUSES.has(attempt.status)) {
    if (attempt.status === outcome) {
      return {
        outcome: 'UPDATED',
        paymentAttemptId: attempt.id,
        status: attempt.status,
        resolvedAt: attempt.resolvedAt as string,
      };
    }
    return { outcome: 'TERMINAL_CONFLICT', currentStatus: attempt.status };
  }

  if (!VALID_OUTCOMES.has(outcome)) {
    return { outcome: 'INVALID_OUTCOME' };
  }

  const resolvedAt = new Date().toISOString();
  updatePaymentAttempt(attempt.id, {
    status: outcome as PaymentAttempt['status'],
    resolvedAt,
  });

  return {
    outcome: 'UPDATED',
    paymentAttemptId: attempt.id,
    status: outcome,
    resolvedAt,
  };
}
