import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getMarket } from '../modules/market/marketConfig';
import { getProductById } from '../modules/catalog/catalogData';
import { checkOfferFit } from '../modules/catalog/offerFitService';
import { createCart, getCart, replaceCartItems, CartItem } from '../modules/cart/cartStore';

const router = Router();

// POST /api/carts — create a new cart
router.post('/', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const marketCode = typeof body.marketCode === 'string' ? body.marketCode.trim() : '';

  if (!marketCode) {
    res.status(400).json({ errorCode: 'MARKET_REQUIRED', message: 'marketCode is required.' });
    return;
  }

  const market = getMarket(marketCode);
  if (!market) {
    res.status(400).json({ errorCode: 'UNKNOWN_MARKET', message: `Market "${marketCode}" is not supported.` });
    return;
  }

  const customerContext = body.customerContext as Record<string, unknown> | undefined;
  const customerId = typeof customerContext?.customerId === 'string' ? customerContext.customerId : undefined;

  const cart = createCart(market.marketCode, market.currency, customerId);

  res.status(201).json({
    cartId: cart.cartId,
    status: cart.status,
    marketCode: cart.marketCode,
    createdAt: cart.createdAt,
  });
});

// POST /api/carts/:cartId/items — replace cart line items
router.post('/:cartId/items', (req: Request, res: Response) => {
  const { cartId } = req.params;
  const cart = getCart(cartId);

  if (!cart) {
    res.status(404).json({ errorCode: 'CART_NOT_FOUND', message: `Cart "${cartId}" was not found.` });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const lines = body.lines;

  if (!Array.isArray(lines) || lines.length === 0) {
    res.status(400).json({ errorCode: 'LINES_REQUIRED', message: 'At least one line item is required.' });
    return;
  }

  // Extract device and plan lines to check offer-fit
  const deviceLines = (lines as Array<Record<string, unknown>>).filter(l => l.lineType === 'DEVICE');
  const planLines = (lines as Array<Record<string, unknown>>).filter(l => l.lineType === 'PLAN');

  if (deviceLines.length > 0 && planLines.length > 0) {
    const deviceId = deviceLines[0].productId as string;
    const planId = planLines[0].productId as string;
    const fitResult = checkOfferFit(deviceId, planId);

    if (!fitResult.compatible) {
      res.status(422).json({
        errorCode: 'OFFER_NOT_COMPATIBLE',
        message: fitResult.reason,
        reason: fitResult.reason,
        compatible: false,
      });
      return;
    }
  }

  const market = getMarket(cart.marketCode);
  const vatRate = market ? market.vatRate : 0.15;

  const cartItems: CartItem[] = [];

  for (const line of lines as Array<Record<string, unknown>>) {
    const lineType = typeof line.lineType === 'string' ? line.lineType : '';
    const productId = typeof line.productId === 'string' ? line.productId : '';
    const quantity = typeof line.quantity === 'number' ? line.quantity : 1;

    if (!lineType || !productId) {
      res.status(400).json({ errorCode: 'INVALID_LINE', message: 'Each line requires lineType and productId.' });
      return;
    }

    const product = getProductById(productId);
    if (!product) {
      res.status(422).json({
        errorCode: 'PRODUCT_NOT_FOUND',
        message: `Product "${productId}" was not found.`,
      });
      return;
    }

    cartItems.push({
      cartItemId: randomUUID(),
      lineType,
      productId,
      displayName: product.name,
      quantity,
      onceOffAmount: product.priceOnceOff,
      recurringAmount: product.priceRecurring,
    });
  }

  const updatedCart = replaceCartItems(cartId, cartItems, vatRate);
  if (!updatedCart) {
    res.status(404).json({ errorCode: 'CART_NOT_FOUND', message: `Cart "${cartId}" was not found.` });
    return;
  }

  res.status(200).json({
    cartId: updatedCart.cartId,
    status: updatedCart.status,
    items: updatedCart.items.map(i => ({
      cartItemId: i.cartItemId,
      lineType: i.lineType,
      productId: i.productId,
      displayName: i.displayName,
      quantity: i.quantity,
      onceOffAmount: i.onceOffAmount,
      recurringAmount: i.recurringAmount,
    })),
    totals: updatedCart.totals,
  });
});

// GET /api/carts/:cartId — retrieve cart summary
router.get('/:cartId', (req: Request, res: Response) => {
  const { cartId } = req.params;
  const cart = getCart(cartId);

  if (!cart) {
    res.status(404).json({ errorCode: 'CART_NOT_FOUND', message: `Cart "${cartId}" was not found.` });
    return;
  }

  res.status(200).json({
    cartId: cart.cartId,
    market: {
      marketCode: cart.marketCode,
      currency: cart.currencyCode,
    },
    items: cart.items.map(i => ({
      lineId: i.cartItemId,
      lineType: i.lineType,
      name: i.displayName,
      onceOffAmount: i.onceOffAmount,
      recurringAmount: i.recurringAmount,
    })),
    credits: [],
    totals: {
      onceOffSubtotal: cart.totals.onceOffSubtotal,
      recurringSubtotal: cart.totals.recurringSubtotal,
      taxAmount: cart.totals.taxAmount,
      creditAmount: cart.totals.creditAmount,
      payableNow: cart.totals.payableNow,
    },
  });
});

export default router;
