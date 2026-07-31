import { Router, Request, Response } from 'express';

interface Product {
  id: string;
  name: string;
  availableMarkets: string[];
}

const products: Product[] = [
  { id: 'iphone-15-pro', name: 'iPhone 15 Pro 256GB', availableMarkets: ['ZA', 'KE', 'NG'] },
  { id: 'samsung-s24-ultra', name: 'Samsung Galaxy S24 Ultra 256GB', availableMarkets: ['ZA', 'KE', 'NG'] },
  { id: 'iphone-15', name: 'iPhone 15 128GB', availableMarkets: ['ZA', 'KE', 'NG'] },
  { id: 'samsung-s24', name: 'Samsung Galaxy S24 256GB', availableMarkets: ['ZA', 'KE', 'NG'] },
  { id: 'samsung-a54', name: 'Samsung Galaxy A54 128GB', availableMarkets: ['ZA', 'KE', 'NG'] },
  { id: 'iphone-14', name: 'iPhone 14 128GB', availableMarkets: ['ZA', 'KE', 'NG'] },
  { id: 'za-only-product', name: 'ZA Exclusive Offer', availableMarkets: ['ZA'] },
];

export const catalogRouter = Router();

catalogRouter.get('/products', (req: Request, res: Response) => {
  const market = typeof req.query['market'] === 'string' ? req.query['market'] : null;
  const filtered = market
    ? products.filter((p) => p.availableMarkets.includes(market))
    : products;
  res.status(200).json({ products: filtered });
});
