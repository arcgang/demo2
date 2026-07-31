export interface PaymentAttemptRecord {
  paymentAttemptId: string;
  orderId: string;
  method: 'card' | 'mobile_money';
  providerReference: string;
  walletRef?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const attempts = new Map<string, PaymentAttemptRecord>();

export function clearAll(): void {
  attempts.clear();
}

export function persistPaymentAttempt(record: PaymentAttemptRecord): void {
  attempts.set(record.paymentAttemptId, record);
}

export function getPaymentAttempt(paymentAttemptId: string): PaymentAttemptRecord | undefined {
  return attempts.get(paymentAttemptId);
}

export function updatePaymentAttemptStatus(paymentAttemptId: string, status: string): PaymentAttemptRecord | undefined {
  const record = attempts.get(paymentAttemptId);
  if (!record) return undefined;
  record.status = status;
  record.updatedAt = new Date().toISOString();
  return record;
}
