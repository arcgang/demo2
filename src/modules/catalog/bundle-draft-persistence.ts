export const BUNDLE_EXPIRY_MS = 30 * 60 * 1000;

export interface BundleDraftPayload {
  plan: string | null;
  addons: Record<string, boolean>;
  timestamp: number;
}

export interface BundleDraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function draftKey(productId: string): string {
  return `draft:bundle:${productId}`;
}

export function saveBundleDraft(
  productId: string,
  plan: string | null,
  addons: Record<string, boolean>,
  storage: BundleDraftStorage,
  now: number = Date.now(),
): void {
  const payload: BundleDraftPayload = { plan, addons, timestamp: now };
  storage.setItem(draftKey(productId), JSON.stringify(payload));
}

export function restoreBundleDraft(
  productId: string,
  storage: BundleDraftStorage,
  now: number = Date.now(),
): BundleDraftPayload | null {
  const raw = storage.getItem(draftKey(productId));
  if (!raw) return null;
  let draft: BundleDraftPayload;
  try {
    draft = JSON.parse(raw) as BundleDraftPayload;
  } catch {
    return null;
  }
  if (!draft || !draft.timestamp || now - draft.timestamp > BUNDLE_EXPIRY_MS) {
    storage.removeItem(draftKey(productId));
    return null;
  }
  return draft;
}
