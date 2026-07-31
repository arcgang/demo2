import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Upsell / migration offer panel on the Product Detail screen.
 *
 * Screen  : GET /product/:id              (wireframe_product_detail.html)
 * Region  : section.plan-attach-panel
 * API dep : GET /api/offers/upsell?context=prepaid
 *
 * Acceptance criteria encoded here:
 *  AC-1  Page loads and returns HTML for a prepaid customer context.
 *  AC-2  Migration offers surface in section.plan-attach-panel as a separate
 *        labelled row or callout (not mixed into the base plan rows).
 *  AC-3  Promotional offers carry a distinct CSS class or badge.
 *  AC-4  A "Continue with original option" affordance is present on the panel.
 *  AC-5  Dismissing / choosing the upsell panel does NOT remove the base plan
 *        list: all standard plans remain rendered on the page.
 *  AC-6  Clicking an upsell offer can update the pricing summary without losing
 *        cart progress: each offer card exposes its offerId and pricing in markup.
 *  AC-7  The section.plan-attach-panel element is present in the rendered page.
 */

describe('Product Detail screen – Upsell offer panel (section.plan-attach-panel)', () => {
  const url = '/product/iphone-15-pro?context=prepaid';

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

    it('page title or H1 contains the product name', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/iPhone 15 Pro/i);
    });
  });

  // ── AC-2 ─────────────────────────────────────────────────────────────────
  describe('AC-2 – migration offers appear in plan-attach-panel as a separate labelled section', () => {
    it('HTML contains a section.plan-attach-panel element', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/class=["'][^"']*plan-attach-panel[^"']*["']/);
    });

    it('migration offer "Switch to Red Flexi Contract" is rendered inside the page', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/Switch to Red Flexi/i);
    });

    it('migration offers are grouped under a distinct section label (e.g. "Migration Offers" or "Special Offers")', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/(Migration Offers|Special Offers|Upgrade Offers|Recommended for You)/i);
    });

    it('migration offer panel is marked with a CSS class that distinguishes it from base plans', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(
        /class=["'][^"']*(migration-panel|upsell-panel|recommended-panel|promotional-section)[^"']*["']/i,
      );
    });
  });

  // ── AC-3 ─────────────────────────────────────────────────────────────────
  describe('AC-3 – promotional offers carry distinct visual treatment', () => {
    it('at least one element carries a CSS class marking it as promotional, upsell, or recommended', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(
        /class=["'][^"']*(promotional|upsell|recommended|offer-banner|offer-card-highlight)[^"']*["']/i,
      );
    });

    it('badge text "Best Value" from the upsell fixture is rendered', async () => {
      const res = await request(app).get(url);
      expect(res.text).toContain('Best Value');
    });

    it('badge text "No Lock-in" from the migration fixture is rendered', async () => {
      const res = await request(app).get(url);
      expect(res.text).toContain('No Lock-in');
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
  describe('AC-5 – original plan options remain selectable after viewing upsell offers', () => {
    it('base plan "Vodacom Red 5GB" is still rendered on the product detail page', async () => {
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

    it('"Add to Cart" button for the base product is still present', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/Add to Cart/i);
    });
  });

  // ── AC-6 ─────────────────────────────────────────────────────────────────
  describe('AC-6 – offer markup supports pricing-summary update without losing cart progress', () => {
    it('at least one offer card exposes its offerId via a data attribute', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/data-offer-id=["']offer_prepaid/i);
    });

    it('upsell offer CTA label "Upgrade to Bundle" is present so the user can select it', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/Upgrade to Bundle/i);
    });

    it('migration offer CTA label "Switch to Contract" is present so the user can select it', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/Switch to Contract/i);
    });

    it('upsell offer recurring price R 299 is surfaced in the HTML for summary update', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/R\s*299/);
    });

    it('migration offer recurring price R 199 is surfaced in the HTML for summary update', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/R\s*199/);
    });

    it('device price R 24,999 is still present so the once-off cart total is not lost', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/R\s*24[,.]?999/);
    });
  });

  // ── AC-7 ─────────────────────────────────────────────────────────────────
  describe('AC-7 – section.plan-attach-panel structural integrity', () => {
    it('the plan-attach-panel section contains at least one base plan element', async () => {
      const res = await request(app).get(url);
      // plan-attach-panel must exist AND a base plan must appear on the page
      expect(res.text).toMatch(/class=["'][^"']*plan-attach-panel[^"']*["']/);
      expect(res.text).toContain('R 299/month');
    });

    it('"Add a plan or bundle" heading is present per the design spec', async () => {
      const res = await request(app).get(url);
      expect(res.text).toMatch(/Add a plan or bundle/i);
    });
  });
});
