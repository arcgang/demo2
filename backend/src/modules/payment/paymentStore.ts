export interface PaymentAttempt {
  id: string;
  orderId: string;
  method: 'mobile_money' | 'card';
  provider: 'mpesa' | 'vodacom_wallet' | 'psp';
  status: 'pending' | 'awaiting_customer_action' | 'success' | 'failed' | 'cancelled';
  providerReference: string | null;
  amount?: number;
  initiatedAt: string;
  resolvedAt: string | null;
}

const paymentAttempts: PaymentAttempt[] = [];

export function clearAll(): void {
  paymentAttempts.length = 0;
}

export function getPaymentAttempts(): PaymentAttempt[] {
  return [...paymentAttempts];
}

export function seedPaymentAttempt(attempt: PaymentAttempt): void {
  paymentAttempts.push({ ...attempt });
}

export function persistPaymentAttempt(attempt: PaymentAttempt): void {
  paymentAttempts.push({ ...attempt });
}

export function getPaymentAttemptById(id: string): PaymentAttempt | undefined {
  return paymentAttempts.find((a) => a.id === id);
}

export function getPaymentAttemptByProviderRef(ref: string): PaymentAttempt | undefined {
  return paymentAttempts.find((a) => a.providerReference === ref);
}

export function getPaymentAttemptByOrderId(orderId: string): PaymentAttempt | undefined {
  return [...paymentAttempts].reverse().find((a) => a.orderId === orderId);
}

const TERMINAL_STATUSES = new Set<PaymentAttempt['status']>(['success', 'failed', 'cancelled']);

export function isTerminalStatus(status: PaymentAttempt['status']): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function updatePaymentAttempt(id: string, update: Partial<PaymentAttempt>): void {
  const idx = paymentAttempts.findIndex((a) => a.id === id);
  if (idx !== -1) {
    const current = paymentAttempts[idx];
    if (TERMINAL_STATUSES.has(current.status) && 'status' in update && update.status !== current.status) {
      return;
    }
    paymentAttempts[idx] = { ...current, ...update };
  }
}
