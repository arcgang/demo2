import { Router, Request, Response } from 'express';
import { VALID_CONDITIONS, getEstimatedCredit, TradeInCondition } from '../modules/trade-in/tradeInAdapter';
import { saveQuote, findQuote, attachCartToQuote } from '../modules/trade-in/tradeInStore';

const tradeInRouter = Router();
const cartTradeInRouter = Router();

// POST /api/trade-in/quote
tradeInRouter.post('/quote', (req: Request, res: Response) => {
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

  const estimatedCredit = getEstimatedCredit(
    (brand as string).trim(),
    (model as string).trim(),
    condition as TradeInCondition,
  );

  const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const quote = saveQuote({
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

// POST /api/cart/trade-in
const ONCE_OFF_SUBTOTAL = 18999.00;
const VAT_RATE = 0.15;

cartTradeInRouter.post('/trade-in', (req: Request, res: Response) => {
  const { quoteId } = req.body as Record<string, unknown>;

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

  if (quote.cartId !== null) {
    res.status(409).json({ errorCode: 'QUOTE_ALREADY_USED', message: 'This trade-in quote has already been applied to a cart.' });
    return;
  }

  // Associate quote with a stub cart reference
  const cartId = `cart_${quoteId}`;
  attachCartToQuote(quote.id, cartId);

  const tradeInCredit = quote.estimatedCredit;
  const onceOffSubtotal = ONCE_OFF_SUBTOTAL;
  const vat = Math.round(onceOffSubtotal * VAT_RATE * 100) / 100;
  const total = Math.round((onceOffSubtotal + vat - tradeInCredit) * 100) / 100;

  res.status(200).json({
    tradeInCredit,
    onceOffSubtotal,
    vat,
    total,
  });
});

export { tradeInRouter, cartTradeInRouter };
