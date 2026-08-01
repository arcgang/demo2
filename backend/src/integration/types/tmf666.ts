/** TMF666 Account Management — resource type definitions. */

export interface AccountBalance {
  amount: number;
  unit: string;
  balanceType?: string;
  validFor?: { startDateTime?: string; endDateTime?: string };
}

export interface AccountRef {
  id: string;
  href?: string;
  name?: string;
  description?: string;
}

export interface BillingAccount {
  id: string;
  href?: string;
  name?: string;
  accountType?: string;
  state?: string;
  currency?: string;
  accountBalance?: AccountBalance[];
  relatedParty?: Array<{ id: string; role?: string; name?: string }>;
}
