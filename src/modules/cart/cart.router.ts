import { Router, Request, Response } from 'express';

interface CartItem {
  productId: string;
  quantity: number;
}

interface ValidateCartRequest {
  marketCode: string;
  items: CartItem[];
}

const productMarkets: Record<string, string[]> = {
  'iphone-15-pro': ['ZA', 'KE', 'NG'],
  'samsung-s24-ultra': ['ZA', 'KE', 'NG'],
  'iphone-15': ['ZA', 'KE', 'NG'],
  'samsung-s24': ['ZA', 'KE', 'NG'],
  'samsung-a54': ['ZA', 'KE', 'NG'],
  'iphone-14': ['ZA', 'KE', 'NG'],
  'za-only-product': ['ZA'],
};

export const cartRouter = Router();

cartRouter.post('/validate', (req: Request, res: Response) => {
  const body = req.body as ValidateCartRequest;
  const { marketCode, items } = body;

  if (!marketCode || !Array.isArray(items)) {
    res.status(400).json({ error: 'marketCode and items are required' });
    return;
  }

  const validatedItems = items.map((item) => {
    const available = productMarkets[item.productId];
    const eligible = available ? available.includes(marketCode) : false;
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
