/**
 * Unit tests for Payment Orchestration Service logic:
 *   - Market-aware payment method filtering
 *   - Adapter dispatch (card vs mobile_money)
 *   - PAN-rejection guard
 *
 * These tests import the service modules directly (no HTTP layer) following
 * the same ts-jest/Jest setup used throughout this project.
 *
 * Expected module paths (must be created by implementation):
 *   src/modules/payment/marketPaymentConfig.ts
 *     export function getPaymentMethodsForMarket(marketCode: string): PaymentMethodConfig[]
 *   src/modules/payment/panGuard.ts
 *     export function containsRawPan(payload: Record<string, unknown>): boolean
 *   src/modules/payment/paymentOrchestrationService.ts
 *     export function initiatePayment(input: InitiatePaymentInput): PaymentAttemptResult
 */

// ---------------------------------------------------------------------------
// Market filtering
// ---------------------------------------------------------------------------

describe('getPaymentMethodsForMarket — market filtering', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getPaymentMethodsForMarket } = require('../../modules/payment/marketPaymentConfig');

  it('ZA market returns an array containing a method with type "card"', () => {
    const methods: Array<{ type: string }> = getPaymentMethodsForMarket('ZA');
    expect(methods.some((m) => m.type === 'card')).toBe(true);
  });

  it('ZA market returns an array containing a method with type "mobile_money"', () => {
    const methods: Array<{ type: string }> = getPaymentMethodsForMarket('ZA');
    expect(methods.some((m) => m.type === 'mobile_money')).toBe(true);
  });

  it('XX card-only market returns exactly one method', () => {
    const methods: Array<{ type: string }> = getPaymentMethodsForMarket('XX');
    expect(methods).toHaveLength(1);
  });

  it('XX card-only market does NOT include mobile_money', () => {
    const methods: Array<{ type: string }> = getPaymentMethodsForMarket('XX');
    expect(methods.some((m) => m.type === 'mobile_money')).toBe(false);
  });

  it('returns null or empty array for an unknown market code', () => {
    const methods = getPaymentMethodsForMarket('ZZZZ_UNKNOWN');
    // Implementation may return null OR empty array for unknown market
    expect(methods === null || (Array.isArray(methods) && methods.length === 0)).toBe(true);
  });

  it('every returned method has a non-empty type, label, and iconKey', () => {
    const methods: Array<{ type: string; label: string; iconKey: string }> =
      getPaymentMethodsForMarket('ZA');
    for (const m of methods) {
      expect(typeof m.type).toBe('string');
      expect(m.type.length).toBeGreaterThan(0);
      expect(typeof m.label).toBe('string');
      expect(m.label.length).toBeGreaterThan(0);
      expect(typeof m.iconKey).toBe('string');
      expect(m.iconKey.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// PAN-rejection guard
// ---------------------------------------------------------------------------

describe('containsRawPan — PAN detection', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { containsRawPan } = require('../../modules/payment/panGuard');

  it('returns true for a payload where token is a 16-digit numeric string (Visa)', () => {
    expect(containsRawPan({ token: '4111111111111111' })).toBe(true);
  });

  it('returns true for a payload where token is a 16-digit numeric string (Mastercard)', () => {
    expect(containsRawPan({ token: '5500000000000004' })).toBe(true);
  });

  it('returns true when any field value is a 16-digit numeric string', () => {
    expect(containsRawPan({ walletRef: '4111111111111111' })).toBe(true);
  });

  it('returns true when a nested field contains a 16-digit numeric string', () => {
    expect(containsRawPan({ cardNumber: '4111111111111111' })).toBe(true);
  });

  it('returns false for a valid PSP token (non-numeric, opaque string)', () => {
    expect(containsRawPan({ token: 'psp_tok_abc123xyz' })).toBe(false);
  });

  it('returns false for a 16-character alphanumeric string (not all digits)', () => {
    expect(containsRawPan({ token: 'psp_tok_abc12345' })).toBe(false);
  });

  it('returns false for a numeric string shorter than 16 digits', () => {
    expect(containsRawPan({ token: '411111111111111' })).toBe(false);
  });

  it('returns false for a numeric string longer than 16 digits', () => {
    expect(containsRawPan({ token: '41111111111111112' })).toBe(false);
  });

  it('returns false for an empty payload', () => {
    expect(containsRawPan({})).toBe(false);
  });

  it('returns false for a wallet reference that is a phone number with country code (not 16 digits)', () => {
    expect(containsRawPan({ walletRef: '27835550000' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Adapter dispatch
// ---------------------------------------------------------------------------

describe('initiatePayment — adapter dispatch', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { initiatePayment } = require('../../modules/payment/paymentOrchestrationService');

  it('dispatches to the card adapter and returns a PaymentAttempt with method="card"', () => {
    const result = initiatePayment({
      orderId: 'ord_unit_card',
      method: 'card',
      token: 'psp_tok_unit_abc',
    });
    expect(result.method).toBe('card');
  });

  it('card dispatch result has a non-empty paymentAttemptId', () => {
    const result = initiatePayment({
      orderId: 'ord_unit_card_2',
      method: 'card',
      token: 'psp_tok_unit_xyz',
    });
    expect(typeof result.paymentAttemptId).toBe('string');
    expect(result.paymentAttemptId.length).toBeGreaterThan(0);
  });

  it('card dispatch result has a providerReference (token stored as reference)', () => {
    const result = initiatePayment({
      orderId: 'ord_unit_card_3',
      method: 'card',
      token: 'psp_tok_unit_ref',
    });
    expect(typeof result.providerReference).toBe('string');
    expect(result.providerReference.length).toBeGreaterThan(0);
  });

  it('card PaymentAttempt result does NOT contain pan, cvv, or expiry properties', () => {
    const result = initiatePayment({
      orderId: 'ord_unit_card_4',
      method: 'card',
      token: 'psp_tok_unit_safe',
    }) as Record<string, unknown>;
    expect(result.pan).toBeUndefined();
    expect(result.cvv).toBeUndefined();
    expect(result.expiry).toBeUndefined();
    expect(result.cardNumber).toBeUndefined();
  });

  it('dispatches to the mobile money adapter and returns a PaymentAttempt with method="mobile_money"', () => {
    const result = initiatePayment({
      orderId: 'ord_unit_mm',
      method: 'mobile_money',
      walletRef: '27835550001',
    });
    expect(result.method).toBe('mobile_money');
  });

  it('mobile money dispatch result has a non-empty paymentAttemptId', () => {
    const result = initiatePayment({
      orderId: 'ord_unit_mm_2',
      method: 'mobile_money',
      walletRef: '27835550002',
    });
    expect(typeof result.paymentAttemptId).toBe('string');
    expect(result.paymentAttemptId.length).toBeGreaterThan(0);
  });

  it('mobile money dispatch result has a walletRef stored', () => {
    const result = initiatePayment({
      orderId: 'ord_unit_mm_3',
      method: 'mobile_money',
      walletRef: '27835550003',
    });
    expect(typeof result.walletRef).toBe('string');
    expect(result.walletRef.length).toBeGreaterThan(0);
  });

  it('mobile money PaymentAttempt status is a pending/initiated state', () => {
    const result = initiatePayment({
      orderId: 'ord_unit_mm_4',
      method: 'mobile_money',
      walletRef: '27835550004',
    });
    const pendingStates = [
      'PENDING',
      'PENDING_PROVIDER_CONFIRMATION',
      'INITIATED',
    ];
    expect(pendingStates).toContain(result.status);
  });

  it('throws or returns an error outcome when method is neither card nor mobile_money', () => {
    expect(() =>
      initiatePayment({ orderId: 'ord_unit_bad', method: 'bitcoin' }),
    ).toThrow();
  });
});
