import {
  saveCheckoutDraft,
  restoreCheckoutDraft,
  CHECKOUT_DRAFT_KEY,
  CHECKOUT_EXPIRY_MS,
  SAFE_FIELDS,
  CARD_FIELDS,
} from '../checkout-draft-persistence';

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

const SAMPLE_FIELDS: Record<string, string> = {
  'first-name': 'Amina',
  'last-name': 'Dlamini',
  'email': 'amina@example.com',
  'phone': '+27835550123',
  'address': '10 Palm Street',
  'city': 'Johannesburg',
  'postal-code': '2001',
};

describe('checkout draft – (a) draft is saved on field change', () => {
  it('writes a JSON entry to localStorage under draft:checkout', () => {
    const storage = makeStorage();
    saveCheckoutDraft(SAMPLE_FIELDS, 'card', storage, NOW);

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem.mock.calls[0][0]).toBe(CHECKOUT_DRAFT_KEY);
  });

  it('persists all allowed customer-details field values', () => {
    const storage = makeStorage();
    saveCheckoutDraft(SAMPLE_FIELDS, 'card', storage, NOW);

    const saved = JSON.parse(storage.store[CHECKOUT_DRAFT_KEY]);
    for (const field of SAFE_FIELDS) {
      expect(saved.fields[field]).toBe(SAMPLE_FIELDS[field]);
    }
  });

  it('persists the selected payment-method value', () => {
    const storage = makeStorage();
    saveCheckoutDraft(SAMPLE_FIELDS, 'mobile-money', storage, NOW);

    const saved = JSON.parse(storage.store[CHECKOUT_DRAFT_KEY]);
    expect(saved.paymentMethod).toBe('mobile-money');
  });

  it('stores a timestamp in the payload', () => {
    const storage = makeStorage();
    saveCheckoutDraft(SAMPLE_FIELDS, 'card', storage, NOW);

    const saved = JSON.parse(storage.store[CHECKOUT_DRAFT_KEY]);
    expect(saved.timestamp).toBe(NOW);
  });
});

describe('checkout draft – (b) expired draft is discarded and not restored', () => {
  it('still returns the draft when it is exactly 30 minutes old (boundary is exclusive)', () => {
    const storage = makeStorage();
    saveCheckoutDraft(SAMPLE_FIELDS, 'card', storage, NOW);

    const result = restoreCheckoutDraft(storage, NOW + CHECKOUT_EXPIRY_MS);
    expect(result).not.toBeNull();
  });

  it('returns null for a draft that is 30 minutes and 1 ms old', () => {
    const storage = makeStorage();
    saveCheckoutDraft(SAMPLE_FIELDS, 'card', storage, NOW);

    const result = restoreCheckoutDraft(storage, NOW + CHECKOUT_EXPIRY_MS + 1);
    expect(result).toBeNull();
  });

  it('removes the expired entry from storage', () => {
    const storage = makeStorage();
    saveCheckoutDraft(SAMPLE_FIELDS, 'card', storage, NOW);

    restoreCheckoutDraft(storage, NOW + CHECKOUT_EXPIRY_MS + 1);
    expect(storage.removeItem).toHaveBeenCalledWith(CHECKOUT_DRAFT_KEY);
    expect(storage.store[CHECKOUT_DRAFT_KEY]).toBeUndefined();
  });

  it('returns null for a draft 31 minutes old', () => {
    const storage = makeStorage();
    saveCheckoutDraft(SAMPLE_FIELDS, 'card', storage, NOW);

    expect(restoreCheckoutDraft(storage, NOW + 31 * 60 * 1000)).toBeNull();
  });

  it('returns the draft when it is within the 30-minute window', () => {
    const storage = makeStorage();
    saveCheckoutDraft(SAMPLE_FIELDS, 'card', storage, NOW);

    const result = restoreCheckoutDraft(storage, NOW + 29 * 60 * 1000);
    expect(result).not.toBeNull();
    expect(result!.fields['first-name']).toBe('Amina');
  });

  it('returns null when no draft exists', () => {
    const storage = makeStorage();
    expect(restoreCheckoutDraft(storage, NOW)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    const storage = makeStorage();
    storage.store[CHECKOUT_DRAFT_KEY] = 'not-json';
    expect(restoreCheckoutDraft(storage, NOW)).toBeNull();
  });
});

describe('checkout draft – (c) card fields are never included in a saved draft', () => {
  it('SAFE_FIELDS does not include any card field name', () => {
    for (const cardField of CARD_FIELDS) {
      expect((SAFE_FIELDS as readonly string[]).includes(cardField)).toBe(false);
    }
  });

  it('card-number is absent from the saved payload even when passed in fieldValues', () => {
    const storage = makeStorage();
    saveCheckoutDraft(
      { ...SAMPLE_FIELDS, 'card-number': '4111111111111111' },
      'card',
      storage,
      NOW,
    );

    const saved = JSON.parse(storage.store[CHECKOUT_DRAFT_KEY]);
    expect(saved.fields['card-number']).toBeUndefined();
    expect(JSON.stringify(saved)).not.toContain('4111111111111111');
  });

  it('expiry is absent from the saved payload even when passed in fieldValues', () => {
    const storage = makeStorage();
    saveCheckoutDraft({ ...SAMPLE_FIELDS, expiry: '12/28' }, 'card', storage, NOW);

    const saved = JSON.parse(storage.store[CHECKOUT_DRAFT_KEY]);
    expect(saved.fields['expiry']).toBeUndefined();
  });

  it('cvv is absent from the saved payload even when passed in fieldValues', () => {
    const storage = makeStorage();
    saveCheckoutDraft({ ...SAMPLE_FIELDS, cvv: '123' }, 'card', storage, NOW);

    const saved = JSON.parse(storage.store[CHECKOUT_DRAFT_KEY]);
    expect(saved.fields['cvv']).toBeUndefined();
  });

  it('cardholder-name is absent from the saved payload (not in SAFE_FIELDS scope)', () => {
    const storage = makeStorage();
    saveCheckoutDraft({ ...SAMPLE_FIELDS, 'cardholder-name': 'Amina Dlamini' }, 'card', storage, NOW);

    const saved = JSON.parse(storage.store[CHECKOUT_DRAFT_KEY]);
    expect(saved.fields['cardholder-name']).toBeUndefined();
  });

  it('the restored draft also contains no card field values', () => {
    const storage = makeStorage();
    saveCheckoutDraft(
      { ...SAMPLE_FIELDS, 'card-number': '4111111111111111', cvv: '999', expiry: '01/30' },
      'card',
      storage,
      NOW,
    );

    const result = restoreCheckoutDraft(storage, NOW + 1000);
    expect(result).not.toBeNull();
    const fieldsJson = JSON.stringify(result!.fields);
    expect(fieldsJson).not.toContain('card-number');
    expect(fieldsJson).not.toContain('cvv');
    expect(fieldsJson).not.toContain('expiry');
  });
});
