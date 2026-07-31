import { Router, Request, Response } from 'express';
import { listMarkets, getMarketByCode, getDefaultMarket } from '../modules/market/market.service';

const marketsRouter = Router();

marketsRouter.get('/default', (_req: Request, res: Response) => {
  const market = getDefaultMarket();
  if (!market) {
    res.status(404).json({ error: 'No active market found' });
    return;
  }
  res.status(200).json(market);
});

marketsRouter.get('/:code', (req: Request, res: Response) => {
  const market = getMarketByCode(req.params['code']);
  if (!market) {
    res.status(404).json({ error: 'Market not found' });
    return;
  }
  res.status(200).json(market);
});

marketsRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ markets: listMarkets() });
});

export default marketsRouter;
