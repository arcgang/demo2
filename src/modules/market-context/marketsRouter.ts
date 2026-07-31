import { Router, Request, Response } from 'express';
import { MarketContextService } from './MarketContextService';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const markets = await MarketContextService.list();
  res.json(markets);
});

router.get('/:code', async (req: Request, res: Response) => {
  const market = await MarketContextService.resolve(req.params['code']);
  if (!market) {
    res.status(404).json({ errorCode: 'MARKET_NOT_FOUND', message: 'Market not found or inactive.' });
    return;
  }
  res.json(market);
});

export default router;
