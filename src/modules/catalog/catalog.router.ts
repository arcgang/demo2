import { Router, Request, Response } from 'express';
import { catalogProducts } from './catalog.fixture';

export const catalogRouter = Router();

catalogRouter.get('/products', (req: Request, res: Response) => {
  const market = typeof req.query['market'] === 'string' ? req.query['market'] : null;
  const filtered = market
    ? catalogProducts.filter((p) => p.availableMarkets.includes(market))
    : catalogProducts;
  res.status(200).json({ products: filtered });
});
