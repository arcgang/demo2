import { Router, Request, Response } from 'express';
import { catalogProducts } from '../catalog/catalog.fixture';
import { listMarkets } from '../market/market.service';

interface CartItem {
  productId: string;
  quantity: number;
}

interface ValidateCartRequest {
  marketCode: string;
  items: CartItem[];
}

export const cartRouter = Router();

cartRouter.post('/validate', (req: Request, res: Response) => {
  const body = req.body as ValidateCartRequest;
  const { marketCode, items } = body;

  if (!marketCode || !Array.isArray(items)) {
    res.status(400).json({ error: 'marketCode and items are required' });
    return;
  }

  const knownMarkets = listMarkets();
  const marketExists = knownMarkets.some((m) => m.code === marketCode);
  if (!marketExists) {
    res.status(400).json({ error: `Unknown market code: ${marketCode}` });
    return;
  }

  const validatedItems = items.map((item) => {
    const product = catalogProducts.find((p) => p.id === item.productId);
    const eligible = product ? product.availableMarkets.includes(marketCode) : false;
    return {
      productId: item.productId,
      quantity: item.quantity,
      eligible,
      warning: eligible ? undefined : `This item is not available in your selected market.`,
    };
  });

  const canProceedToCheckout = validatedItems.every((i) => i.eligible);

  res.status(200).json({ items: validatedItems, canProceedToCheckout });
});
