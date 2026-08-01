import { test, expect } from '@playwright/test';

/**
 * Playwright E2E tests for the Checkout screen in purchase-journey mode.
 *
 * Requirements verified:
 *  (a) No RICA identity field (idDocumentNumber / idDocumentType) is present.
 *  (b) All rendered mandatory fields have aria-required="true".
 *  (c) The marketing consent checkbox is marked optional (label contains "Optional"
 *      and the input does not carry aria-required="true").
 */

test.describe('Checkout — purchase journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checkout?journey=purchase');
  });

  // (a) No RICA identity field present
  test('(a) idDocumentNumber input is absent', async ({ page }) => {
    const field = page.locator('input[name="idDocumentNumber"], select[name="idDocumentNumber"]');
    await expect(field).toHaveCount(0);
  });

  test('(a) idDocumentType input is absent', async ({ page }) => {
    const field = page.locator('input[name="idDocumentType"], select[name="idDocumentType"]');
    await expect(field).toHaveCount(0);
  });

  test('(a) "Identity Document Number" label is absent', async ({ page }) => {
    await expect(page.locator('text=Identity Document Number')).toHaveCount(0);
  });

  // (b) All rendered mandatory fields have aria-required="true"
  test('(b) firstName input has aria-required="true"', async ({ page }) => {
    await expect(page.locator('input[name="firstName"]')).toHaveAttribute('aria-required', 'true');
  });

  test('(b) lastName input has aria-required="true"', async ({ page }) => {
    await expect(page.locator('input[name="lastName"]')).toHaveAttribute('aria-required', 'true');
  });

  test('(b) email input has aria-required="true"', async ({ page }) => {
    await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-required', 'true');
  });

  test('(b) phone input has aria-required="true"', async ({ page }) => {
    await expect(page.locator('input[name="phone"]')).toHaveAttribute('aria-required', 'true');
  });

  test('(b) deliveryAddress input has aria-required="true"', async ({ page }) => {
    await expect(page.locator('input[name="deliveryAddress"]')).toHaveAttribute('aria-required', 'true');
  });

  test('(b) terms checkbox has aria-required="true"', async ({ page }) => {
    await expect(page.locator('input[name="terms"]')).toHaveAttribute('aria-required', 'true');
  });

  // (c) Marketing checkbox is marked optional
  test('(c) marketingConsent checkbox does NOT have aria-required="true"', async ({ page }) => {
    const checkbox = page.locator('input[name="marketingConsent"]');
    await expect(checkbox).toBeVisible();
    // Must not carry aria-required at all, or must be "false"
    const ariaRequired = await checkbox.getAttribute('aria-required');
    expect(ariaRequired).not.toBe('true');
  });

  test('(c) marketing consent label contains "Optional"', async ({ page }) => {
    const label = page.locator('label[for="marketingConsent"]');
    await expect(label).toContainText('Optional');
  });

  test('(c) marketingConsent checkbox does not carry the required attribute', async ({ page }) => {
    const checkbox = page.locator('input[name="marketingConsent"]');
    const required = await checkbox.getAttribute('required');
    expect(required).toBeNull();
  });
});
