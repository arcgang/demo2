export const CHECKOUT_EXPIRY_MS = 30 * 60 * 1000;
export const CHECKOUT_DRAFT_KEY = 'draft:checkout';

export const CARD_FIELDS = ['card-number', 'expiry', 'cvv'] as const;
export type CardField = (typeof CARD_FIELDS)[number];

export const SAFE_FIELDS = [
  'first-name',
  'last-name',
  'email',
  'phone',
  'address',
  'city',
  'postal-code',
] as const;
export type SafeField = (typeof SAFE_FIELDS)[number];

export interface CheckoutDraftPayload {
  fields: Partial<Record<SafeField, string>>;
  paymentMethod: string | null;
  timestamp: number;
}

export interface CheckoutDraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function saveCheckoutDraft(
  fieldValues: Partial<Record<string, string>>,
  paymentMethod: string | null,
  storage: CheckoutDraftStorage,
  now: number = Date.now(),
): void {
  const safeValues: Partial<Record<SafeField, string>> = {};
  for (const name of SAFE_FIELDS) {
    if (fieldValues[name] != null) {
      safeValues[name] = fieldValues[name] as string;
    }
  }
  const payload: CheckoutDraftPayload = {
    fields: safeValues,
    paymentMethod,
    timestamp: now,
  };
  storage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(payload));
}

export function restoreCheckoutDraft(
  storage: CheckoutDraftStorage,
  now: number = Date.now(),
): CheckoutDraftPayload | null {
  const raw = storage.getItem(CHECKOUT_DRAFT_KEY);
  if (!raw) return null;
  let draft: CheckoutDraftPayload;
  try {
    draft = JSON.parse(raw) as CheckoutDraftPayload;
  } catch {
    return null;
  }
  if (!draft || !draft.timestamp || now - draft.timestamp > CHECKOUT_EXPIRY_MS) {
    storage.removeItem(CHECKOUT_DRAFT_KEY);
    return null;
  }
  return draft;
}
