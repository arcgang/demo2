import { Router, Request, Response } from 'express';
import { getMarketContext } from './marketConfig';

export const marketConfigRouter = Router();

marketConfigRouter.get('/:marketId', (req: Request, res: Response) => {
  const { marketId } = req.params;

  const ctx = getMarketContext(marketId);
  if (!ctx) {
    res.status(404).json({
      errorCode: 'MARKET_NOT_FOUND',
      message: `Market "${marketId}" is not supported.`,
    });
    return;
  }

  res.status(200).json(ctx);
});
