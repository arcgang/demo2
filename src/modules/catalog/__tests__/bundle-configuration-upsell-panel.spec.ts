import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Upsell offer panel on the Bundle Configuration screen.
 *
 * Screen  : GET /product/:id/configure   (wireframe_bundle_configuration.html)
 * Region  : section.plan-selection
 * API dep : GET /api/offers/upsell?context=prepaid
 *
 * Acceptance criteria encoded here:
 *  AC-1  Page loads and returns HTML when a prepaid customer context is supplied.
 *  AC-2  A "Recommended for You" banner / card is inserted inside the
 *        plan-selection region, above or below the standard plan list.
 *  AC-3  Promotional offers carry a visually distinct CSS class or badge so they
 *        are clearly distinguishable from the base plan options.
 *  AC-4  A "Continue with original option" affordance is present, letting the
 *        user proceed without the upsell.
 *  AC-5  Choosing or dismissing the upsell panel does NOT remove the base plan
 *        list: all standard plans remain present in the rendered HTML.
 *  AC-6  Each upsell offer card embeds enough pricing data that the pricing
 *        summary can be updated on selection (offer ID + price surfaced in markup).
 *  AC-7  The aside.pricing-summary section is present so the pricing summary can
 *        be updated when an offer is chosen.
 */

describe('Bundle Configuration screen – Upsell offer panel (section.plan-selection)', () => {
  const url = '/product/iphone-15-pro/configure?context=prepaid';

  // ── AC-1 ─────────────────────────────────────────────────────────────────
  describe('AC-1 – page serves HTML for a prepaid customer context', () => {
    it('returns HTTP 200', async () => {
      const res = await request(app).get(url);
      expect(res.status).toBe(200);
    });

    it('Content-Type is text/html', async () => {
      const res = await request(app).get(url);
      expect(res.headers['content-type']).toMatch(/text\/html/i);
    });
  });

  // ── AC-2 ─────────────────────────────────────────────────────────────────
  describe('AC-2 – "Recommended for You" banner in section.plan-selection', () => {
    it('HTML contains a section.plan-selection element', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/class=["'][^"']*plan-selection[^"']*["']/);
    });

    it('HTML contains a "Recommended for You" heading or label', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/Recommended for You/i);
    });

    it('HTML contains at least one upsell offer from the prepaid fixture – Weekend Max Bundle', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/Weekend Max Bundle/i);
    });

    it('HTML contains at least one migration offer from the prepaid fixture – Switch to Red Flexi', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/Switch to Red Flexi/i);
    });
  });

  // ── AC-3 ─────────────────────────────────────────────────────────────────
  describe('AC-3 – promotional offers carry distinct visual treatment', () => {
    it('at least one element has a CSS class that marks it as promotional, upsell, or recommended', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(
        /class=["'][^"']*(promotional|upsell|recommended|offer-banner|offer-card-highlight)[^"']*["']/i,
      );
    });

    it('the upsell offer badge text "Best Value" is rendered in the HTML', async () => {
      const res = await request(app).get(url);
      expect(res.text).toContain('Best Value');
    });

    it('the migration offer badge text "No Lock-in" is rendered in the HTML', async () => {
      const res = await request(app).get(url);
      expect(res.text).toContain('No Lock-in');
    });

    it('promotional offer elements are wrapped in a container separate from the base-plan list', async () => {
      const res = await request(app).get(url);
      // Both a promotional section marker AND a base plan must coexist
      expect(res.text).toMatch(/class=["'][^"']*(upsell-panel|recommended-panel|promotional-section)[^"']*["']/i);
      expect(res.text).toContain('Vodacom Red 5GB');
    });
  });

  // ── AC-4 ─────────────────────────────────────────────────────────────────
  describe('AC-4 – "Continue with original option" affordance', () => {
    it('HTML contains a "Continue with original option" button or link', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/Continue with original option/i);
    });
  });

  // ── AC-5 ─────────────────────────────────────────────────────────────────
  describe('AC-5 – original plan selection is preserved', () => {
    it('base plan "Vodacom Red 5GB" is still rendered after the upsell panel is inserted', async () => {
      const res = await request(app).get(url);
      expect(res.text).toContain('Vodacom Red 5GB');
    });

    it('base plan "Vodacom Unlimited 20GB" is still rendered', async () => {
      const res = await request(app).get(url);
      expect(res.text).toContain('Vodacom Unlimited 20GB');
    });

    it('base plan "Vodacom Red Premium" is still rendered', async () => {
      const res = await request(app).get(url);
      expect(res.text).toContain('Vodacom Red Premium');
    });
  });

  // ── AC-6 ─────────────────────────────────────────────────────────────────
  describe('AC-6 – offer markup carries data needed for pricing-summary update', () => {
    it('at least one offer card exposes its offerId via a data attribute', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/data-offer-id=["']offer_prepaid/i);
    });

    it('upsell offer pricing (R 299/month) is embedded in the HTML', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/R\s*299/);
    });

    it('migration offer pricing (R 199/month) is embedded in the HTML', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/R\s*199/);
    });
  });

  // ── AC-7 ─────────────────────────────────────────────────────────────────
  describe('AC-7 – aside.pricing-summary is present for cart-progress continuity', () => {
    it('HTML contains an aside.pricing-summary element', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/class=["'][^"']*pricing-summary[^"']*["']/);
    });

    it('pricing summary shows a "Pricing Summary" heading', async () => {
      const res = await request(app).get(url);
      expect(res.text).toContain('Pricing Summary');
    });
  });
});
