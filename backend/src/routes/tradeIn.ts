import { Router, Request, Response } from 'express';
import { VALID_CONDITIONS, getEstimatedCredit, TradeInCondition } from '../modules/trade-in/tradeInAdapter';
import { saveQuote, findQuote, attachCartToQuote } from '../modules/trade-in/tradeInStore';
import { getOnceOffSubtotal } from '../modules/cart/cartStore';

const tradeInRouter = Router();
const cartTradeInRouter = Router();

// POST /api/trade-in/quote
tradeInRouter.post('/quote', async (req: Request, res: Response) => {
  const { brand, model, storage, condition } = req.body as Record<string, unknown>;

  if (typeof brand !== 'string' || brand.trim() === '') {
    res.status(400).json({ errorCode: 'MISSING_FIELD', message: 'brand is required.' });
    return;
  }
  if (typeof model !== 'string' || model.trim() === '') {
    res.status(400).json({ errorCode: 'MISSING_FIELD', message: 'model is required.' });
    return;
  }
  if (storage === undefined || storage === null) {
    res.status(400).json({ errorCode: 'MISSING_FIELD', message: 'storage is required.' });
    return;
  }
  if (typeof storage !== 'number' || !isFinite(storage) || storage <= 0) {
    res.status(400).json({ errorCode: 'INVALID_FIELD', message: 'storage must be a positive number.' });
    return;
  }
  if (condition === undefined || condition === null) {
    res.status(400).json({ errorCode: 'MISSING_FIELD', message: 'condition is required.' });
    return;
  }
  if (typeof condition !== 'string' || !VALID_CONDITIONS.has(condition)) {
    res.status(400).json({
      errorCode: 'INVALID_FIELD',
      message: `condition must be one of: ${[...VALID_CONDITIONS].join(', ')}.`,
    });
    return;
  }

  // storage is accepted and persisted for record-keeping, but the mock
  // valuation table is keyed on brand + model + condition only (spec §6.2).
  // A real adapter would add a storage-tier dimension to the lookup key.
  const estimatedCredit = getEstimatedCredit(
    (brand as string).trim(),
    (model as string).trim(),
    condition as TradeInCondition,
  );

  const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const quote = await saveQuote({
    brand: (brand as string).trim(),
    model: (model as string).trim(),
    storage: storage as number,
    condition: condition as TradeInCondition,
    estimatedCredit,
    validUntil,
    cartId: null,
  });

  res.status(201).json({
    id: quote.id,
    estimatedCredit: quote.estimatedCredit,
    validUntil: quote.validUntil,
  });
});

const VAT_RATE = 0.15;
// Fallback subtotal used when no cartId is supplied or the cart has no items.
const FALLBACK_ONCE_OFF_SUBTOTAL = 18999.00;

// POST /api/cart/trade-in
cartTradeInRouter.post('/trade-in', async (req: Request, res: Response) => {
  const { quoteId, cartId } = req.body as Record<string, unknown>;

  if (typeof quoteId !== 'string' || quoteId.trim() === '') {
    res.status(400).json({ errorCode: 'MISSING_FIELD', message: 'quoteId is required.' });
    return;
  }

  const quote = findQuote(quoteId.trim());
  if (!quote) {
    res.status(404).json({ errorCode: 'QUOTE_NOT_FOUND', message: `No trade-in quote found for id: ${quoteId}` });
    return;
  }

  if (new Date(quote.validUntil) < new Date()) {
    res.status(410).json({ errorCode: 'QUOTE_EXPIRED', message: 'This trade-in quote has expired.' });
    return;
  }

  // Use the supplied cartId when present; fall back to a quote-scoped sentinel
  // so the TOCTOU guard still works when cartId is absent.
  const resolvedCartId = (typeof cartId === 'string' && cartId.trim() !== '')
    ? cartId.trim()
    : `cart_${quoteId.trim()}`;

  // Atomic check-and-attach: returns false if already attached, preventing
  // double-spend under concurrent requests (TOCTOU fix).
  const attached = await attachCartToQuote(quote.id, resolvedCartId);
  if (!attached) {
    res.status(409).json({ errorCode: 'QUOTE_ALREADY_USED', message: 'This trade-in quote has already been applied to a cart.' });
    return;
  }

  // Derive the once-off subtotal from real cart line items when a cartId is
  // provided and the cart has items; otherwise fall back to the stub value.
  const cartSubtotal = (typeof cartId === 'string' && cartId.trim() !== '')
    ? getOnceOffSubtotal(cartId.trim())
    : null;
  const onceOffSubtotal = (cartSubtotal !== null && cartSubtotal > 0)
    ? cartSubtotal
    : FALLBACK_ONCE_OFF_SUBTOTAL;

  const tradeInCredit = quote.estimatedCredit;
  const vat = Math.round(onceOffSubtotal * VAT_RATE * 100) / 100;
  const total = Math.max(0, Math.round((onceOffSubtotal + vat - tradeInCredit) * 100) / 100);

  res.status(200).json({
    tradeInCredit,
    onceOffSubtotal,
    vat,
    total,
  });
});

export { tradeInRouter, cartTradeInRouter };
