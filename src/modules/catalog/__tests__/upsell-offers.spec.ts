import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests for GET /api/offers/upsell
 *
 * Covers:
 *  - PrepaidUpsellOffer data model shape
 *  - Happy path: context=prepaid returns ≥2 offers with correct structure
 *  - Missing context query param returns 400 with an error envelope
 *  - isPromotional flag is present and true on every returned offer
 *  - Both 'upsell' and 'migration' offer types appear in the seeded data
 */

describe('GET /api/offers/upsell', () => {
  describe('happy path – context=prepaid', () => {
    it('returns HTTP 200', async () => {
      const res = await request(app).get('/api/offers/upsell?context=prepaid');
      expect(res.status).toBe(200);
    });

    it('returns a JSON body with an offers array containing at least 2 items', async () => {
      const res = await request(app).get('/api/offers/upsell?context=prepaid');
      expect(res.body).toHaveProperty('offers');
      expect(Array.isArray(res.body.offers)).toBe(true);
      expect(res.body.offers.length).toBeGreaterThanOrEqual(2);
    });

    it('every offer carries isPromotional: true', async () => {
      const res = await request(app).get('/api/offers/upsell?context=prepaid');
      for (const offer of res.body.offers) {
        expect(offer.isPromotional).toBe(true);
      }
    });

    it('every offer contains the required PrepaidUpsellOffer fields', async () => {
      const res = await request(app).get('/api/offers/upsell?context=prepaid');
      for (const offer of res.body.offers) {
        // identity
        expect(typeof offer.offerId).toBe('string');
        expect(offer.offerId.length).toBeGreaterThan(0);

        // discriminated type
        expect(['upsell', 'migration']).toContain(offer.type);

        // display
        expect(typeof offer.title).toBe('string');
        expect(offer.title.length).toBeGreaterThan(0);
        expect(typeof offer.description).toBe('string');
        expect(offer.description.length).toBeGreaterThan(0);

        // optional badge / label (must be string when present)
        if (offer.badge !== undefined && offer.badge !== null) {
          expect(typeof offer.badge).toBe('string');
        }

        // base offer reference
        expect(typeof offer.baseOfferRef).toBe('string');
        expect(offer.baseOfferRef.length).toBeGreaterThan(0);

        // pricing summary
        expect(offer).toHaveProperty('pricingSummary');
        const ps = offer.pricingSummary;
        expect(typeof ps.currency).toBe('string');
        // at least one of onceOffAmount or recurringAmount must be present
        const hasOnceOff = typeof ps.onceOffAmount === 'number';
        const hasRecurring = typeof ps.recurringAmount === 'number';
        expect(hasOnceOff || hasRecurring).toBe(true);

        // CTA label
        expect(typeof offer.ctaLabel).toBe('string');
        expect(offer.ctaLabel.length).toBeGreaterThan(0);

        // promotional flag (already checked per-offer above, but explicit here)
        expect(offer.isPromotional).toBe(true);
      }
    });

    it('seeded data includes at least one offer of type "upsell"', async () => {
      const res = await request(app).get('/api/offers/upsell?context=prepaid');
      const types: string[] = res.body.offers.map((o: { type: string }) => o.type);
      expect(types).toContain('upsell');
    });

    it('seeded data includes at least one offer of type "migration"', async () => {
      const res = await request(app).get('/api/offers/upsell?context=prepaid');
      const types: string[] = res.body.offers.map((o: { type: string }) => o.type);
      expect(types).toContain('migration');
    });
  });

  describe('missing context query parameter', () => {
    it('returns HTTP 400 when context is omitted', async () => {
      const res = await request(app).get('/api/offers/upsell');
      expect(res.status).toBe(400);
    });

    it('returns a standard error envelope with errorCode and message', async () => {
      const res = await request(app).get('/api/offers/upsell');
      expect(res.body).toHaveProperty('errorCode');
      expect(typeof res.body.errorCode).toBe('string');
      expect(res.body.errorCode.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty('message');
      expect(typeof res.body.message).toBe('string');
    });

    it('does not return an offers array on 400', async () => {
      const res = await request(app).get('/api/offers/upsell');
      expect(res.body.offers).toBeUndefined();
    });
  });
});
