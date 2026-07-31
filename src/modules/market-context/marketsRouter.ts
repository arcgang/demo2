import { Router, Request, Response, NextFunction } from 'express';
import { MarketContextService } from './MarketContextService';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const markets = await MarketContextService.list();
    res.json(markets);
  } catch (err) {
    next(err);
  }
});

router.get('/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const market = await MarketContextService.resolve(req.params['code']);
    if (!market) {
      res.status(404).json({ errorCode: 'MARKET_NOT_FOUND', message: 'Market not found or inactive.' });
      return;
    }
    res.json(market);
  } catch (err) {
    next(err);
  }
});

export default router;
