export const CART_EXPIRY_MS = 30 * 60 * 1000;
export const CART_DRAFT_KEY = 'draft:cart';

export interface CartItem {
  id: string;
  qty: string | number;
}

export interface CartDraftPayload {
  promoCode: string;
  items: CartItem[];
  timestamp: number;
}

export interface CartDraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function saveCartDraft(
  promoCode: string,
  items: CartItem[],
  storage: CartDraftStorage,
  now: number = Date.now(),
): void {
  const payload: CartDraftPayload = { promoCode, items, timestamp: now };
  storage.setItem(CART_DRAFT_KEY, JSON.stringify(payload));
}

export function restoreCartDraft(
  storage: CartDraftStorage,
  now: number = Date.now(),
): CartDraftPayload | null {
  const raw = storage.getItem(CART_DRAFT_KEY);
  if (!raw) return null;
  let draft: CartDraftPayload;
  try {
    draft = JSON.parse(raw) as CartDraftPayload;
  } catch {
    return null;
  }
  if (!draft || !draft.timestamp || now - draft.timestamp > CART_EXPIRY_MS) {
    storage.removeItem(CART_DRAFT_KEY);
    return null;
  }
  return draft;
}
