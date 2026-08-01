/** TMF676 Payment Management — resource type definitions. */

export type PaymentMethodType =
  | 'tokenizedCard'
  | 'digitalWallet'
  | 'voucher'
  | 'bankTransfer'
  | 'cash';

export interface PaymentRef {
  id: string;
  href?: string;
  name?: string;
}

export interface PaymentMeans {
  id: string;
  href?: string;
  paymentMethodType?: PaymentMethodType;
  totalAmount?: { amount: number; unit: string };
  status?: string;
  providerReference?: string;
}
