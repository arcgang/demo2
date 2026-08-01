import { Router, Request, Response } from 'express';
import { getOrCreateCart, lookupCart } from './cart.store';

export const cartRouter = Router();

cartRouter.post('/items', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const itemId = body.itemId as string | undefined;
  const itemType = body.itemType as string | undefined;

  if (!itemId || !itemType) {
    res.status(400).json({ errorCode: 'INVALID_INPUT', message: 'itemId and itemType are required.' });
    return;
  }

  const cart = getOrCreateCart(req, res);
  cart.items.push({ itemId, itemType });
  res.status(201).json({ itemCount: cart.items.length });
});

cartRouter.get('/', (req: Request, res: Response) => {
  const cart = lookupCart(req);
  if (!cart) {
    res.status(200).json({ itemCount: 0, items: [] });
    return;
  }
  res.status(200).json({ itemCount: cart.items.length, items: cart.items });
});
