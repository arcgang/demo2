import { Router, Request, Response } from 'express';
import { getMarket } from '../modules/market/marketConfig';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const marketCode = req.query.market as string | undefined;

  if (!marketCode || !marketCode.trim()) {
    res.status(400).json({
      errorCode: 'MARKET_REQUIRED',
      message: 'Query parameter ?market is required.',
    });
    return;
  }

  const market = getMarket(marketCode);
  if (!market) {
    res.status(400).json({
      errorCode: 'UNKNOWN_MARKET',
      message: `Market "${marketCode}" is not supported.`,
    });
    return;
  }

  res.status(200).json({
    marketCode: market.marketCode,
    currency: market.currency,
    language: market.language,
    vatRate: market.vatRate,
    paymentMethods: market.paymentMethods,
  });
});

export default router;
