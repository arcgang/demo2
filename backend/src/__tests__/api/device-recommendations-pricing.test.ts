/**
 * Unit tests for the device recommendations pricing calculator.
 *
 * The pricing calculator is the function (or module) that:
 *   - Accepts a list of selected attachments (plans, accessories, add-ons)
 *   - Computes once-off subtotal (sum of onceOff amounts)
 *   - Computes VAT at 15% on the once-off subtotal
 *   - Computes monthly total (sum of monthly amounts)
 *   - Returns { onceOffSubtotal, vatRate, vatAmount, monthlyTotal }
 *
 * These are unit tests that import the calculator directly from the module
 * that will be created at:
 *   backend/src/modules/devices/recommendationsPricingCalculator.ts
 */

import {
  calculateRecommendationsPricing,
  SelectedAttachment,
  PricingResult,
} from '../../modules/devices/recommendationsPricingCalculator';

// ─────────────────────────────────────────────────────────────────────────────
// Unit: empty selection
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateRecommendationsPricing — empty selection', () => {
  it('returns zero onceOffSubtotal for empty attachments', () => {
    const result: PricingResult = calculateRecommendationsPricing([], 0.15);
    expect(result.onceOffSubtotal).toBe(0);
  });

  it('returns zero vatAmount for empty attachments', () => {
    const result: PricingResult = calculateRecommendationsPricing([], 0.15);
    expect(result.vatAmount).toBe(0);
  });

  it('returns zero monthlyTotal for empty attachments', () => {
    const result: PricingResult = calculateRecommendationsPricing([], 0.15);
    expect(result.monthlyTotal).toBe(0);
  });

  it('always returns vatRate of 0.15', () => {
    const result: PricingResult = calculateRecommendationsPricing([], 0.15);
    expect(result.vatRate).toBe(0.15);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit: once-off only (accessories)
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateRecommendationsPricing — once-off items (accessories)', () => {
  const accessories: SelectedAttachment[] = [
    { id: 'acc_airpods', type: 'ACCESSORY', required: false, pricingRule: { onceOff: 4999, monthly: 0 } },
    { id: 'acc_case', type: 'ACCESSORY', required: false, pricingRule: { onceOff: 799, monthly: 0 } },
  ];

  it('onceOffSubtotal is the sum of all onceOff pricingRule values', () => {
    const result = calculateRecommendationsPricing(accessories, 0.15);
    expect(result.onceOffSubtotal).toBe(5798);
  });

  it('vatAmount is onceOffSubtotal * 0.15 rounded to 2 decimal places', () => {
    const result = calculateRecommendationsPricing(accessories, 0.15);
    const expected = parseFloat((5798 * 0.15).toFixed(2));
    expect(result.vatAmount).toBeCloseTo(expected, 2);
  });

  it('monthlyTotal is 0 when no monthly charges are selected', () => {
    const result = calculateRecommendationsPricing(accessories, 0.15);
    expect(result.monthlyTotal).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit: monthly only (plans and add-ons)
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateRecommendationsPricing — monthly items (plan + add-ons)', () => {
  const monthlyItems: SelectedAttachment[] = [
    { id: 'plan_unlimited_20gb', type: 'PLAN', required: true, pricingRule: { onceOff: 0, monthly: 799 } },
    { id: 'addon_extra_10gb', type: 'ADDON', required: false, pricingRule: { onceOff: 0, monthly: 199 } },
    { id: 'addon_intl_calling', type: 'ADDON', required: false, pricingRule: { onceOff: 0, monthly: 149 } },
  ];

  it('monthlyTotal is the sum of all monthly pricingRule values', () => {
    const result = calculateRecommendationsPricing(monthlyItems, 0.15);
    expect(result.monthlyTotal).toBe(1147);
  });

  it('onceOffSubtotal is 0 when no once-off charges are selected', () => {
    const result = calculateRecommendationsPricing(monthlyItems, 0.15);
    expect(result.onceOffSubtotal).toBe(0);
  });

  it('vatAmount is 0 when onceOffSubtotal is 0', () => {
    const result = calculateRecommendationsPricing(monthlyItems, 0.15);
    expect(result.vatAmount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit: mixed selection (plan + accessory + add-on)
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateRecommendationsPricing — mixed selection', () => {
  const mixed: SelectedAttachment[] = [
    { id: 'plan_red_premium', type: 'PLAN', required: true, pricingRule: { onceOff: 0, monthly: 1299 } },
    { id: 'acc_airpods', type: 'ACCESSORY', required: false, pricingRule: { onceOff: 4999, monthly: 0 } },
    { id: 'acc_case', type: 'ACCESSORY', required: false, pricingRule: { onceOff: 799, monthly: 0 } },
    { id: 'addon_roaming', type: 'ADDON', required: false, pricingRule: { onceOff: 0, monthly: 299 } },
  ];

  it('onceOffSubtotal sums only onceOff fields (4999 + 799 = 5798)', () => {
    const result = calculateRecommendationsPricing(mixed, 0.15);
    expect(result.onceOffSubtotal).toBe(5798);
  });

  it('monthlyTotal sums only monthly fields (1299 + 299 = 1598)', () => {
    const result = calculateRecommendationsPricing(mixed, 0.15);
    expect(result.monthlyTotal).toBe(1598);
  });

  it('vatAmount is 5798 * 0.15 = 869.70', () => {
    const result = calculateRecommendationsPricing(mixed, 0.15);
    expect(result.vatAmount).toBeCloseTo(869.70, 2);
  });

  it('vatRate is always 0.15 regardless of selection', () => {
    const result = calculateRecommendationsPricing(mixed, 0.15);
    expect(result.vatRate).toBe(0.15);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit: VAT rounding to 2 decimal places
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateRecommendationsPricing — VAT precision', () => {
  it('vatAmount is rounded to exactly 2 decimal places', () => {
    // R299 * 0.15 = 44.85 — exact
    const items: SelectedAttachment[] = [
      { id: 'acc_screen', type: 'ACCESSORY', required: false, pricingRule: { onceOff: 299, monthly: 0 } },
    ];
    const result = calculateRecommendationsPricing(items, 0.15);
    const str = result.vatAmount.toString();
    const decimals = str.includes('.') ? str.split('.')[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });

  it('vatAmount for R399 is 59.85 (399 * 0.15)', () => {
    const items: SelectedAttachment[] = [
      { id: 'acc_adapter', type: 'ACCESSORY', required: false, pricingRule: { onceOff: 399, monthly: 0 } },
    ];
    const result = calculateRecommendationsPricing(items, 0.15);
    expect(result.vatAmount).toBeCloseTo(59.85, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit: result shape always has all required fields
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateRecommendationsPricing — result shape completeness', () => {
  it('result always contains onceOffSubtotal, vatRate, vatAmount, monthlyTotal', () => {
    const result = calculateRecommendationsPricing([], 0.15);
    expect(Object.prototype.hasOwnProperty.call(result, 'onceOffSubtotal')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(result, 'vatRate')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(result, 'vatAmount')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(result, 'monthlyTotal')).toBe(true);
  });

  it('all numeric result fields are numbers (not NaN or undefined)', () => {
    const result = calculateRecommendationsPricing(
      [{ id: 'plan_red_5gb', type: 'PLAN', required: true, pricingRule: { onceOff: 0, monthly: 299 } }],
      0.15,
    );
    expect(Number.isFinite(result.onceOffSubtotal)).toBe(true);
    expect(Number.isFinite(result.vatRate)).toBe(true);
    expect(Number.isFinite(result.vatAmount)).toBe(true);
    expect(Number.isFinite(result.monthlyTotal)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit: iPhone 15 Pro full bundle scenario from task spec
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateRecommendationsPricing — iPhone 15 Pro full bundle from spec', () => {
  // Device price R24999 (not part of attachments pricing calc — it is a device onceOff)
  // Plan: Unlimited 20GB R799/month
  // Add-on: International Calling R149/month
  // Accessory: AirPods Pro R4999 once-off
  // This matches the wireframe pricing summary: once-off R24999 + R4999 = R29998,
  // but the calculator only handles attachments (not the device itself), so:
  // onceOffSubtotal = 4999, vatAmount = 4999*0.15 = 749.85, monthlyTotal = 799+149 = 948
  const attachmentSelection: SelectedAttachment[] = [
    { id: 'plan_unlimited_20gb', type: 'PLAN', required: true, pricingRule: { onceOff: 0, monthly: 799 } },
    { id: 'acc_airpods', type: 'ACCESSORY', required: false, pricingRule: { onceOff: 4999, monthly: 0 } },
    { id: 'addon_intl_calling', type: 'ADDON', required: false, pricingRule: { onceOff: 0, monthly: 149 } },
  ];

  it('onceOffSubtotal is 4999 (AirPods only)', () => {
    const result = calculateRecommendationsPricing(attachmentSelection, 0.15);
    expect(result.onceOffSubtotal).toBe(4999);
  });

  it('monthlyTotal is 948 (799 + 149)', () => {
    const result = calculateRecommendationsPricing(attachmentSelection, 0.15);
    expect(result.monthlyTotal).toBe(948);
  });

  it('vatAmount is 749.85 (4999 * 0.15)', () => {
    const result = calculateRecommendationsPricing(attachmentSelection, 0.15);
    expect(result.vatAmount).toBeCloseTo(749.85, 2);
  });
});
