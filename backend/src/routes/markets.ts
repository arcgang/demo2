import { Router, Request, Response } from 'express';
import { MarketContextService } from '../modules/market/market-context.service';

const router = Router();
const marketContextService = new MarketContextService();

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json(marketContextService.listMarkets());
});

export default router;
