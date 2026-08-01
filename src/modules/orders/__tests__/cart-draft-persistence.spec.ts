import {
  saveCartDraft,
  restoreCartDraft,
  CART_DRAFT_KEY,
  CART_EXPIRY_MS,
} from '../cart-draft-persistence';

function makeStorage(): {
  store: Record<string, string>;
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
} {
  const store: Record<string, string> = {};
  return {
    store,
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
  };
}

const NOW = 1_000_000_000_000;

describe('cart draft – (a) draft is saved on field change', () => {
  it('writes a JSON entry to localStorage under draft:cart', () => {
    const storage = makeStorage();
    saveCartDraft('SUMMER10', [{ id: 'iphone-15-pro', qty: '1' }], storage, NOW);

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem.mock.calls[0][0]).toBe(CART_DRAFT_KEY);
  });

  it('persists the promo-code value', () => {
    const storage = makeStorage();
    saveCartDraft('PROMO42', [], storage, NOW);

    const saved = JSON.parse(storage.store[CART_DRAFT_KEY]);
    expect(saved.promoCode).toBe('PROMO42');
  });

  it('persists the cart item list with ids and quantities', () => {
    const storage = makeStorage();
    const items = [
      { id: 'iphone-15-pro', qty: '2' },
      { id: 'silicone-case', qty: '1' },
    ];
    saveCartDraft('', items, storage, NOW);

    const saved = JSON.parse(storage.store[CART_DRAFT_KEY]);
    expect(saved.items).toEqual(items);
  });

  it('stores a timestamp in the payload', () => {
    const storage = makeStorage();
    saveCartDraft('', [], storage, NOW);

    const saved = JSON.parse(storage.store[CART_DRAFT_KEY]);
    expect(saved.timestamp).toBe(NOW);
  });
});

describe('cart draft – (b) expired draft is discarded and not restored', () => {
  it('still returns the draft when it is exactly 30 minutes old (boundary is exclusive)', () => {
    const storage = makeStorage();
    saveCartDraft('PROMO', [], storage, NOW);

    const result = restoreCartDraft(storage, NOW + CART_EXPIRY_MS);
    expect(result).not.toBeNull();
  });

  it('returns null for a draft that is 30 minutes and 1 ms old', () => {
    const storage = makeStorage();
    saveCartDraft('PROMO', [], storage, NOW);

    const result = restoreCartDraft(storage, NOW + CART_EXPIRY_MS + 1);
    expect(result).toBeNull();
  });

  it('removes the expired entry from storage', () => {
    const storage = makeStorage();
    saveCartDraft('PROMO', [], storage, NOW);

    restoreCartDraft(storage, NOW + CART_EXPIRY_MS + 1);
    expect(storage.removeItem).toHaveBeenCalledWith(CART_DRAFT_KEY);
    expect(storage.store[CART_DRAFT_KEY]).toBeUndefined();
  });

  it('returns null for a draft 31 minutes old', () => {
    const storage = makeStorage();
    saveCartDraft('PROMO', [], storage, NOW);

    expect(restoreCartDraft(storage, NOW + 31 * 60 * 1000)).toBeNull();
  });

  it('returns the draft when it is within the 30-minute window', () => {
    const storage = makeStorage();
    saveCartDraft('EARLY', [{ id: 'iphone-15-pro', qty: '1' }], storage, NOW);

    const result = restoreCartDraft(storage, NOW + 29 * 60 * 1000);
    expect(result).not.toBeNull();
    expect(result!.promoCode).toBe('EARLY');
  });

  it('returns null when no draft exists', () => {
    const storage = makeStorage();
    expect(restoreCartDraft(storage, NOW)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    const storage = makeStorage();
    storage.store[CART_DRAFT_KEY] = '{bad json';
    expect(restoreCartDraft(storage, NOW)).toBeNull();
  });
});
