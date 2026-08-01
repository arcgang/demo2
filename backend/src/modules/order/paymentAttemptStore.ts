import {
  encryptPiiObject,
  decryptPiiObject,
  PAYMENT_SENSITIVE_FIELDS,
} from '../encryption/fieldEncryption';

export interface PaymentAttemptRecord {
  paymentAttemptId: string;
  maskedCardReference?: string;
  walletReference?: string;
  mobileMoneyReference?: string;
}

const store = new Map<string, PaymentAttemptRecord>();

export function persistPaymentAttempt(record: PaymentAttemptRecord): void {
  const encrypted = encryptPiiObject(
    record as Record<string, unknown>,
    PAYMENT_SENSITIVE_FIELDS as string[],
  ) as PaymentAttemptRecord;
  store.set(record.paymentAttemptId, encrypted);
}

export function getPaymentAttempt(paymentAttemptId: string): PaymentAttemptRecord | undefined {
  const encrypted = store.get(paymentAttemptId);
  if (!encrypted) return undefined;
  return decryptPiiObject(
    encrypted as Record<string, unknown>,
    PAYMENT_SENSITIVE_FIELDS as string[],
  ) as PaymentAttemptRecord;
}

export function clearPaymentAttempts(): void {
  store.clear();
}
