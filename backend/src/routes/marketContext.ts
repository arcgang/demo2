import { Router, Request, Response } from 'express';
import { getMarket } from '../modules/market/marketConfig';
import { makeCacheKey, getCached, setCached } from '../modules/shared/responseCache';

const router = Router();

const MARKET_CONFIG_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=600';

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

  const cacheKey = makeCacheKey('market-config', { market: market.marketCode });

  const cached = getCached(cacheKey);
  if (cached) {
    res.set('Cache-Control', cached.cacheControl);
    res.set('ETag', cached.etag);
    if (req.headers['if-none-match'] === cached.etag) {
      res.status(304).end();
      return;
    }
    res.status(200).json(cached.body);
    return;
  }

  const body = {
    marketCode: market.marketCode,
    currency: market.currency,
    language: market.language,
    vatRate: market.vatRate,
    paymentMethods: market.paymentMethods,
  };

  const entry = setCached(cacheKey, body, MARKET_CONFIG_CACHE_CONTROL);
  res.set('Cache-Control', entry.cacheControl);
  res.set('ETag', entry.etag);
  if (req.headers['if-none-match'] === entry.etag) {
    res.status(304).end();
    return;
  }
  res.status(200).json(body);
});

export default router;
