import { Router, Request, Response } from 'express';
import { getMarket } from '../modules/market/marketConfig';

const router = Router();

// GET /api/config/market/:marketId
router.get('/:marketId', (req: Request, res: Response) => {
  const { marketId } = req.params;
  const market = getMarket(marketId);

  if (!market) {
    res.status(404).json({
      errorCode: 'UNKNOWN_MARKET',
      message: `Market "${marketId}" is not supported.`,
    });
    return;
  }

  res.status(200).json({
    marketCode: market.marketCode,
    displayName: market.marketName,
    locale: market.language,
    currency: market.currency,
    taxLabel: market.taxLabel,
    vatRate: market.vatRate,
    enabledPaymentMethods: market.paymentMethods,
    mobileMoneyEnabled: market.mobileMoneyEnabled,
    cardPaymentEnabled: market.cardPaymentEnabled,
  });
});

export default router;
