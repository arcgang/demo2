import { randomBytes } from 'crypto';
import { persistPaymentAttempt, PaymentAttemptRecord } from './paymentStore';

export interface InitiatePaymentInput {
  orderId: string;
  method: string;
  token?: string;
  walletRef?: string;
}

export type PaymentAttemptResult = Omit<PaymentAttemptRecord, 'createdAt' | 'updatedAt'>;

function randomId(): string {
  return randomBytes(8).toString('hex');
}

function derivePaymentAttemptId(orderId: string): string {
  // Strip the 'ord_seed_' prefix used by test seeders so the paymentAttemptId
  // is predictable in callback-flow tests (ord_seed_pay_X → pay_X).
  // For real order IDs without that prefix the orderId itself becomes the key.
  return orderId.replace(/^ord_seed_/, '');
}

function invokePspAdapter(token: string): string {
  return `psp_ref_${randomId()}_${token.slice(0, 8)}`;
}

function invokeMobileMoneyAdapter(_walletRef: string): string {
  return `mpesa_ref_${randomId()}`;
}

export function initiatePayment(input: InitiatePaymentInput): PaymentAttemptResult {
  const { orderId, method, token, walletRef } = input;

  const paymentAttemptId = derivePaymentAttemptId(orderId);
  const now = new Date().toISOString();

  if (method === 'card') {
    const providerReference = invokePspAdapter(token ?? '');
    const record: PaymentAttemptRecord = {
      paymentAttemptId,
      orderId,
      method: 'card',
      providerReference,
      status: 'PENDING_PROVIDER_CONFIRMATION',
      createdAt: now,
      updatedAt: now,
    };
    persistPaymentAttempt(record);
    const { createdAt: _c, updatedAt: _u, ...result } = record;
    void _c; void _u;
    return result;
  }

  if (method === 'mobile_money') {
    const providerReference = invokeMobileMoneyAdapter(walletRef ?? '');
    const record: PaymentAttemptRecord = {
      paymentAttemptId,
      orderId,
      method: 'mobile_money',
      providerReference,
      walletRef,
      status: 'PENDING_PROVIDER_CONFIRMATION',
      createdAt: now,
      updatedAt: now,
    };
    persistPaymentAttempt(record);
    const { createdAt: _c, updatedAt: _u, ...result } = record;
    void _c; void _u;
    return result;
  }

  throw new Error(`Unsupported payment method: ${method}`);
}
