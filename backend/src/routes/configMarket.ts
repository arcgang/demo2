import { Router, Request, Response } from 'express';
import { getMarket } from '../modules/market/marketConfig';

const router = Router();

router.get('/:marketId', (req: Request, res: Response) => {
  const { marketId } = req.params;

  const market = getMarket(marketId);
  if (!market) {
    res.status(404).json({
      errorCode: 'MARKET_NOT_FOUND',
      message: `Market "${marketId}" is not supported.`,
    });
    return;
  }

  res.status(200).json({
    marketCode: market.marketCode,
    marketName: market.marketName,
    locale: market.language,
    currency: market.currency,
    currencySymbol: market.currencySymbol,
    taxLabel: market.taxLabel,
    vatRate: market.vatRate,
    enabledPaymentMethods: market.paymentMethods,
    liteModeDefault: market.liteModeDefault,
  });
});

export default router;
