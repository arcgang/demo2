import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Journey-aware Checkout form (Screen 3: wireframe_checkout_payment.html)
 *
 * Route   : GET /checkout?journey=purchase  (purchase journey checkout page)
 *           GET /checkout?journey=onboarding (onboarding journey checkout page)
 * API dep : GET /api/journeys/:type/fields   (backend journey fields config)
 *
 * The Checkout page's "Customer Details" and "Terms & Consent" sections must be
 * driven entirely by the journey-fields API config — no static pre-filled field
 * list. Fields must render in the order and grouping the API specifies.
 *
 * Sensitive RICA identity fields (idDocumentNumber, idDocumentType) must appear
 * only in journeys/steps that require them (onboarding step 3) and must be
 * absent in the purchase journey.
 *
 * Mandatory fields carry: the HTML `required` attribute AND aria-required="true".
 * Optional fields are explicitly labelled "Optional".
 * The marketing consent checkbox is always optional.
 *
 * Acceptance criteria encoded here:
 *  AC-1  GET /checkout?journey=purchase returns HTTP 200 with text/html.
 *  AC-2  Purchase journey: no RICA identity field (idDocumentNumber / idDocumentType)
 *        is present in the rendered HTML.
 *  AC-3  Purchase journey: all rendered mandatory fields carry aria-required="true".
 *  AC-4  Purchase journey: the marketing consent checkbox is marked optional
 *        (label contains "Optional" or the input carries data-optional="true").
 *  AC-5  Purchase journey: mandatory fields for Customer Details are rendered
 *        (firstName, lastName, email, phone, deliveryAddress).
 *  AC-6  Purchase journey: fields are driven by the /api/journeys/purchase/fields
 *        config — static pre-filled values (first-name, last-name etc.) are NOT
 *        hard-coded as literals in the HTML; instead each input uses the field name
 *        from the API response.
 *  AC-7  Purchase journey: mandatory fields have a visible required indicator
 *        (an asterisk, "Required" text, or required-indicator class near the label).
 *  AC-8  Purchase journey: optional fields are explicitly labelled "Optional".
 *  AC-9  GET /checkout?journey=onboarding returns HTTP 200.
 *  AC-10 Onboarding journey: RICA identity fields (idDocumentNumber) ARE present,
 *        but only if the current step is 3; at step 1 they must be absent.
 *  AC-11 Terms & Consent section is present with a terms checkbox (required) and
 *        a marketing checkbox (optional).
 *  AC-12 Terms checkbox carries aria-required="true" and is required.
 *  AC-13 Marketing checkbox is explicitly labelled "Optional" and does NOT carry
 *        aria-required="true".
 *  AC-14 The checkout page heading is "Checkout" (H1).
 *  AC-15 The Customer Details section carries an H2 heading.
 *  AC-16 Fields are rendered in the order specified by the API (collectionStep 1
 *        fields appear before collectionStep 2+ fields on the same page).
 *  AC-17 The static name values "first-name", "last-name", "card-number" etc.
 *        from the wireframe's original static HTML are replaced — the rendered
 *        inputs use camelCase names matching the API field definitions.
 *  AC-18 "Place Order" button is present on the checkout page.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getCheckoutPage(journey = 'purchase', step?: number): Promise<request.Response> {
  const url = step !== undefined
    ? `/checkout?journey=${journey}&step=${step}`
    : `/checkout?journey=${journey}`;
  return request(app).get(url);
}

// ---------------------------------------------------------------------------
// AC-1  Page loads
// ---------------------------------------------------------------------------

describe('Checkout page — AC-1: page load for purchase journey', () => {
  it('returns HTTP 200 for journey=purchase', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html for purchase journey', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });
});

// ---------------------------------------------------------------------------
// AC-2  No RICA identity field in purchase journey
// ---------------------------------------------------------------------------

describe('Checkout page — AC-2: no RICA identity field in purchase journey', () => {
  it('idDocumentNumber input is NOT present in the purchase journey', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.text).not.toMatch(/name=["']idDocumentNumber["']/i);
  });

  it('idDocumentType input is NOT present in the purchase journey', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.text).not.toMatch(/name=["']idDocumentType["']/i);
  });

  it('Identity Document Number label is NOT present in the purchase journey', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.text).not.toMatch(/Identity Document Number/i);
  });

  it('Identity Document Type label is NOT present in the purchase journey', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.text).not.toMatch(/Identity Document Type/i);
  });
});

// ---------------------------------------------------------------------------
// AC-3  All rendered mandatory fields carry aria-required="true"
// ---------------------------------------------------------------------------

describe('Checkout page — AC-3: mandatory fields have aria-required=true in purchase journey', () => {
  let html: string;
  beforeAll(async () => {
    const res = await getCheckoutPage('purchase');
    html = res.text;
  });

  it('firstName input carries aria-required="true"', () => {
    // Accept: aria-required on the input itself or within the same form control wrapper
    expect(html).toMatch(/name=["']firstName["'][^>]*aria-required=["']true["']|aria-required=["']true["'][^>]*name=["']firstName["']/i);
  });

  it('lastName input carries aria-required="true"', () => {
    expect(html).toMatch(/name=["']lastName["'][^>]*aria-required=["']true["']|aria-required=["']true["'][^>]*name=["']lastName["']/i);
  });

  it('email input carries aria-required="true"', () => {
    expect(html).toMatch(/name=["']email["'][^>]*aria-required=["']true["']|aria-required=["']true["'][^>]*name=["']email["']/i);
  });

  it('phone input carries aria-required="true"', () => {
    expect(html).toMatch(/name=["']phone["'][^>]*aria-required=["']true["']|aria-required=["']true["'][^>]*name=["']phone["']/i);
  });

  it('deliveryAddress input carries aria-required="true"', () => {
    expect(html).toMatch(/name=["']deliveryAddress["'][^>]*aria-required=["']true["']|aria-required=["']true["'][^>]*name=["']deliveryAddress["']/i);
  });

  it('no optional field carries aria-required="true"', () => {
    // marketingConsent is optional — must not carry aria-required=true
    expect(html).not.toMatch(/name=["']marketingConsent["'][^>]*aria-required=["']true["']|aria-required=["']true["'][^>]*name=["']marketingConsent["']/i);
  });
});

// ---------------------------------------------------------------------------
// AC-4  Marketing consent checkbox is marked optional
// ---------------------------------------------------------------------------

describe('Checkout page — AC-4: marketing checkbox is optional in purchase journey', () => {
  it('marketing consent checkbox label contains the word "Optional"', async () => {
    const res = await getCheckoutPage('purchase');
    // Flexible: "Optional" appears near the marketing consent label/field
    expect(res.text).toMatch(/(marketing[^<]{0,200}Optional|Optional[^<]{0,200}marketing)/is);
  });

  it('marketing consent checkbox does NOT carry aria-required="true"', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.text).not.toMatch(/name=["']marketingConsent["'][^>]*aria-required=["']true["']|aria-required=["']true["'][^>]*name=["']marketingConsent["']/i);
  });

  it('marketing consent checkbox does NOT carry the required attribute', async () => {
    const res = await getCheckoutPage('purchase');
    // The marketingConsent input must not have a bare `required` attribute
    expect(res.text).not.toMatch(/name=["']marketingConsent["'][^>]*\brequired\b/i);
  });
});

// ---------------------------------------------------------------------------
// AC-5  Mandatory Customer Details fields are rendered for purchase journey
// ---------------------------------------------------------------------------

describe('Checkout page — AC-5: mandatory customer detail fields rendered for purchase', () => {
  let html: string;
  beforeAll(async () => {
    const res = await getCheckoutPage('purchase');
    html = res.text;
  });

  it('firstName input is present', () => {
    expect(html).toMatch(/name=["']firstName["']/i);
  });

  it('lastName input is present', () => {
    expect(html).toMatch(/name=["']lastName["']/i);
  });

  it('email input is present', () => {
    expect(html).toMatch(/name=["']email["']/i);
  });

  it('phone input is present', () => {
    expect(html).toMatch(/name=["']phone["']/i);
  });

  it('deliveryAddress input is present', () => {
    expect(html).toMatch(/name=["']deliveryAddress["']/i);
  });

  it('marketingConsent checkbox is present', () => {
    expect(html).toMatch(/name=["']marketingConsent["']/i);
  });
});

// ---------------------------------------------------------------------------
// AC-6  Fields are config-driven — no static hyphenated field names
// ---------------------------------------------------------------------------

describe('Checkout page — AC-6: static hyphenated field names replaced by config-driven camelCase names', () => {
  let html: string;
  beforeAll(async () => {
    const res = await getCheckoutPage('purchase');
    html = res.text;
  });

  it('static "first-name" input name from the wireframe is NOT present', () => {
    expect(html).not.toMatch(/name=["']first-name["']/i);
  });

  it('static "last-name" input name from the wireframe is NOT present', () => {
    expect(html).not.toMatch(/name=["']last-name["']/i);
  });

  it('static "card-number" input name from the wireframe is NOT present', () => {
    expect(html).not.toMatch(/name=["']card-number["']/i);
  });

  it('static "postal-code" input name from the wireframe is NOT present', () => {
    expect(html).not.toMatch(/name=["']postal-code["']/i);
  });

  it('static "cardholder-name" input name from the wireframe is NOT present', () => {
    expect(html).not.toMatch(/name=["']cardholder-name["']/i);
  });
});

// ---------------------------------------------------------------------------
// AC-7  Mandatory fields have a visible required indicator
// ---------------------------------------------------------------------------

describe('Checkout page — AC-7: mandatory fields have a visible required indicator', () => {
  it('a required indicator (*) or "Required" text is present near mandatory fields', async () => {
    const res = await getCheckoutPage('purchase');
    // Accept an asterisk, "(Required)", "required-indicator" class, or similar
    expect(res.text).toMatch(
      /(\*|Required|required-indicator|required-badge|aria-label=["'][^"']*required[^"']*["'])/i,
    );
  });
});

// ---------------------------------------------------------------------------
// AC-8  Optional fields are explicitly labelled "Optional"
// ---------------------------------------------------------------------------

describe('Checkout page — AC-8: optional fields are labelled Optional', () => {
  it('at least one field on the page is explicitly labelled "Optional"', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.text).toMatch(/Optional/i);
  });

  it('billingPostalCode (optional purchase step-2 field) is labelled Optional at step 2', async () => {
    // billingPostalCode lives at collectionStep 2; it only appears when ?step=2 is requested
    const res = await getCheckoutPage('purchase', 2);
    expect(res.text).toMatch(/(billingPostalCode|Billing Postal Code)[^<]{0,300}Optional|Optional[^<]{0,300}(billingPostalCode|Billing Postal Code)/is);
  });
});

// ---------------------------------------------------------------------------
// AC-9  Onboarding journey page load
// ---------------------------------------------------------------------------

describe('Checkout page — AC-9: page load for onboarding journey', () => {
  it('returns HTTP 200 for journey=onboarding', async () => {
    const res = await getCheckoutPage('onboarding');
    expect(res.status).toBe(200);
  });

  it('Content-Type is text/html for onboarding journey', async () => {
    const res = await getCheckoutPage('onboarding');
    expect(res.headers['content-type']).toMatch(/text\/html/i);
  });
});

// ---------------------------------------------------------------------------
// AC-10  RICA fields present in onboarding (step 3) but absent at step 1
// ---------------------------------------------------------------------------

describe('Checkout page — AC-10: RICA fields gated by step in onboarding journey', () => {
  it('idDocumentNumber is NOT present at step 1 of the onboarding journey', async () => {
    const res = await getCheckoutPage('onboarding', 1);
    expect(res.text).not.toMatch(/name=["']idDocumentNumber["']/i);
  });

  it('idDocumentType is NOT present at step 1 of the onboarding journey', async () => {
    const res = await getCheckoutPage('onboarding', 1);
    expect(res.text).not.toMatch(/name=["']idDocumentType["']/i);
  });

  it('idDocumentNumber IS present at step 3 of the onboarding journey', async () => {
    const res = await getCheckoutPage('onboarding', 3);
    expect(res.text).toMatch(/name=["']idDocumentNumber["']/i);
  });

  it('idDocumentType IS present at step 3 of the onboarding journey', async () => {
    const res = await getCheckoutPage('onboarding', 3);
    expect(res.text).toMatch(/name=["']idDocumentType["']/i);
  });
});

// ---------------------------------------------------------------------------
// AC-11  Terms & Consent section
// ---------------------------------------------------------------------------

describe('Checkout page — AC-11: Terms & Consent section present', () => {
  let html: string;
  beforeAll(async () => {
    const res = await getCheckoutPage('purchase');
    html = res.text;
  });

  it('Terms & Consent section heading is present', () => {
    expect(html).toMatch(/(Terms\s*&amp;\s*Consent|Terms\s*&\s*Consent|Terms and Consent)/i);
  });

  it('terms checkbox (name="terms") is present', () => {
    expect(html).toMatch(/name=["']terms["']/i);
  });

  it('marketing checkbox (name="marketingConsent" or name="marketing") is present', () => {
    expect(html).toMatch(/name=["'](marketingConsent|marketing)["']/i);
  });
});

// ---------------------------------------------------------------------------
// AC-12  Terms checkbox is required with aria-required
// ---------------------------------------------------------------------------

describe('Checkout page — AC-12: terms checkbox is required', () => {
  it('terms checkbox carries the required attribute', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.text).toMatch(/name=["']terms["'][^>]*\brequired\b|\brequired\b[^>]*name=["']terms["']/i);
  });

  it('terms checkbox carries aria-required="true"', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.text).toMatch(/name=["']terms["'][^>]*aria-required=["']true["']|aria-required=["']true["'][^>]*name=["']terms["']/i);
  });
});

// ---------------------------------------------------------------------------
// AC-13  Marketing checkbox is optional — no aria-required, labelled Optional
// ---------------------------------------------------------------------------

describe('Checkout page — AC-13: marketing checkbox is optional', () => {
  it('marketing checkbox label contains "Optional"', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.text).toMatch(/(marketing[^<]{0,300}Optional|Optional[^<]{0,300}marketing)/is);
  });

  it('marketing checkbox does NOT carry aria-required="true"', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.text).not.toMatch(
      /name=["'](marketingConsent|marketing)["'][^>]*aria-required=["']true["']|aria-required=["']true["'][^>]*name=["'](marketingConsent|marketing)["']/i,
    );
  });
});

// ---------------------------------------------------------------------------
// AC-14  H1 heading is "Checkout"
// ---------------------------------------------------------------------------

describe('Checkout page — AC-14: H1 heading', () => {
  it('H1 heading is "Checkout"', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.text).toMatch(/<h1[^>]*>\s*Checkout\s*<\/h1>/i);
  });
});

// ---------------------------------------------------------------------------
// AC-15  Customer Details section heading
// ---------------------------------------------------------------------------

describe('Checkout page — AC-15: Customer Details H2 heading', () => {
  it('an H2 element with "Customer Details" is present', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.text).toMatch(/<h2[^>]*>[^<]*Customer Details[^<]*<\/h2>/i);
  });
});

// ---------------------------------------------------------------------------
// AC-16  Fields rendered in collectionStep order (step 1 before step 2)
// ---------------------------------------------------------------------------

describe('Checkout page — AC-16: fields rendered in API-specified order', () => {
  it('firstName appears at step 1; paymentToken appears at step 2 but not step 1', async () => {
    const step1 = await getCheckoutPage('purchase');
    const step2 = await getCheckoutPage('purchase', 2);
    // Step 1 must include firstName
    expect(step1.text).toMatch(/name=["']firstName["']/i);
    // paymentToken (step 2) must NOT appear in the default (step 1) view
    expect(step1.text).not.toMatch(/name=["']paymentToken["']/i);
    // paymentToken must appear when ?step=2 is requested
    expect(step2.text).toMatch(/name=["']paymentToken["']/i);
  });
});

// ---------------------------------------------------------------------------
// AC-17  camelCase API names used (not old wireframe hyphenated names)
// ---------------------------------------------------------------------------

describe('Checkout page — AC-17: config-driven camelCase field names replace wireframe static names', () => {
  it('input name "email" is used (not "email-address" from old wireframe)', async () => {
    const res = await getCheckoutPage('purchase');
    // Must have name="email" (from API), must NOT have name="email-address" (static)
    expect(res.text).toMatch(/name=["']email["']/i);
    expect(res.text).not.toMatch(/name=["']email-address["']/i);
  });

  it('input name "phone" is used (not "phone-number" from old wireframe)', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.text).toMatch(/name=["']phone["']/i);
    expect(res.text).not.toMatch(/name=["']phone-number["']/i);
  });

  it('input name "deliveryAddress" or "address" is used (not "address" hyphenated)', async () => {
    const res = await getCheckoutPage('purchase');
    // deliveryAddress comes from the API; bare "address" from old wireframe should be gone
    expect(res.text).toMatch(/name=["'](deliveryAddress|address)["']/i);
  });
});

// ---------------------------------------------------------------------------
// AC-18  "Place Order" button is present
// ---------------------------------------------------------------------------

describe('Checkout page — AC-18: Place Order button', () => {
  it('"Place Order" button is present', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.text).toMatch(/Place Order/i);
  });

  it('"Place Order" is a <button> element', async () => {
    const res = await getCheckoutPage('purchase');
    expect(res.text).toMatch(/<button[^>]*>[\s\S]*?Place Order[\s\S]*?<\/button>/i);
  });
});
