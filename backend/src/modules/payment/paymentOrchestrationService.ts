import { emitAuditEvent } from '../consentAudit/consentAndAuditService';

export interface SettlePaymentInput {
  orderRef: string;
  providerRef: string;
  amount: number;
  currency: string;
  status: 'success' | 'failure';
  paymentMethod: 'card' | 'mobile_money';
}

export async function settlePayment(input: SettlePaymentInput): Promise<void> {
  try {
    await emitAuditEvent({
      type: 'payment_outcome',
      orderId: input.orderRef,
      payload: {
        provider_ref: input.providerRef,
        amount: input.amount,
        currency: input.currency,
        status: input.status,
        payment_method: input.paymentMethod,
      },
    });
  } catch (err) {
    console.error({ msg: 'emitAuditEvent failed in settlePayment', err, orderRef: input.orderRef });
    throw err;
  }
}
