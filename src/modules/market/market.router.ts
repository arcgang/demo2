import { Router, Request, Response } from 'express';
import { listMarkets, getMarketByCode, getDefaultMarket } from './market.service';

export const marketRouter = Router();

marketRouter.get('/default', (_req: Request, res: Response) => {
  const market = getDefaultMarket();
  if (!market) {
    res.status(404).json({ error: 'No active market found' });
    return;
  }
  res.status(200).json(market);
});

marketRouter.get('/:code', (req: Request, res: Response) => {
  const market = getMarketByCode(req.params['code']);
  if (!market) {
    res.status(404).json({ error: 'Market not found' });
    return;
  }
  res.status(200).json(market);
});

marketRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ markets: listMarkets() });
});
