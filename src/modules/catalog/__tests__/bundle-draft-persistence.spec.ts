import {
  saveBundleDraft,
  restoreBundleDraft,
  draftKey,
  BUNDLE_EXPIRY_MS,
} from '../bundle-draft-persistence';

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

const PRODUCT_ID = 'iphone-15-pro';
const KEY = draftKey(PRODUCT_ID);
const NOW = 1_000_000_000_000;

describe('bundle draft – (a) draft is saved on field change', () => {
  it('writes a JSON entry to localStorage keyed as draft:bundle:<productId>', () => {
    const storage = makeStorage();
    saveBundleDraft(PRODUCT_ID, 'unlimited-20gb', { 'addon-data': true, 'addon-international': false }, storage, NOW);

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem.mock.calls[0][0]).toBe(KEY);
  });

  it('persists the selected plan value', () => {
    const storage = makeStorage();
    saveBundleDraft(PRODUCT_ID, 'red-premium', {}, storage, NOW);

    const saved = JSON.parse(storage.store[KEY]);
    expect(saved.plan).toBe('red-premium');
  });

  it('persists add-on checkbox states', () => {
    const storage = makeStorage();
    const addons = { 'addon-data': true, 'addon-international': false, 'addon-roaming': true };
    saveBundleDraft(PRODUCT_ID, null, addons, storage, NOW);

    const saved = JSON.parse(storage.store[KEY]);
    expect(saved.addons).toEqual(addons);
  });

  it('stores a timestamp in the payload', () => {
    const storage = makeStorage();
    saveBundleDraft(PRODUCT_ID, 'red-5gb', {}, storage, NOW);

    const saved = JSON.parse(storage.store[KEY]);
    expect(saved.timestamp).toBe(NOW);
  });

  it('the draft key includes the product id segment', () => {
    expect(KEY).toBe(`draft:bundle:${PRODUCT_ID}`);
  });
});

describe('bundle draft – (b) expired draft is discarded and not restored', () => {
  it('still returns the draft when it is exactly 30 minutes old (boundary is exclusive)', () => {
    const storage = makeStorage();
    saveBundleDraft(PRODUCT_ID, 'red-5gb', {}, storage, NOW);

    const result = restoreBundleDraft(PRODUCT_ID, storage, NOW + BUNDLE_EXPIRY_MS);
    expect(result).not.toBeNull();
  });

  it('returns null for a draft that is 30 minutes and 1 ms old', () => {
    const storage = makeStorage();
    saveBundleDraft(PRODUCT_ID, 'red-5gb', {}, storage, NOW);

    const result = restoreBundleDraft(PRODUCT_ID, storage, NOW + BUNDLE_EXPIRY_MS + 1);
    expect(result).toBeNull();
  });

  it('removes the expired entry from storage', () => {
    const storage = makeStorage();
    saveBundleDraft(PRODUCT_ID, 'red-5gb', {}, storage, NOW);

    restoreBundleDraft(PRODUCT_ID, storage, NOW + BUNDLE_EXPIRY_MS + 1);
    expect(storage.removeItem).toHaveBeenCalledWith(KEY);
    expect(storage.store[KEY]).toBeUndefined();
  });

  it('returns null for a draft 31 minutes old', () => {
    const storage = makeStorage();
    saveBundleDraft(PRODUCT_ID, 'red-5gb', {}, storage, NOW);

    const result = restoreBundleDraft(PRODUCT_ID, storage, NOW + 31 * 60 * 1000);
    expect(result).toBeNull();
  });

  it('returns the draft when it is within the 30-minute window', () => {
    const storage = makeStorage();
    saveBundleDraft(PRODUCT_ID, 'unlimited-20gb', { 'addon-data': true }, storage, NOW);

    const result = restoreBundleDraft(PRODUCT_ID, storage, NOW + 29 * 60 * 1000);
    expect(result).not.toBeNull();
    expect(result!.plan).toBe('unlimited-20gb');
  });

  it('returns null when no draft exists', () => {
    const storage = makeStorage();
    expect(restoreBundleDraft(PRODUCT_ID, storage, NOW)).toBeNull();
  });

  it('returns null for a draft with a missing timestamp field', () => {
    const storage = makeStorage();
    storage.store[KEY] = JSON.stringify({ plan: 'red-5gb', addons: {} });
    expect(restoreBundleDraft(PRODUCT_ID, storage, NOW)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    const storage = makeStorage();
    storage.store[KEY] = 'not-json';
    expect(restoreBundleDraft(PRODUCT_ID, storage, NOW)).toBeNull();
  });
});
