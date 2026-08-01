import { Router, Request, Response } from 'express';
import { MarketContextService } from '../modules/market/market-context.service';
import { CatalogService } from '../modules/catalog/catalog.service';

const router = Router();
const marketContextService = new MarketContextService();
const catalogService = new CatalogService();

router.get('/products', async (req: Request, res: Response) => {
  const marketCode = req.query['market'] as string | undefined;
  if (!marketCode) {
    res.status(400).json({ errorCode: 'MARKET_REQUIRED', message: 'Query parameter ?market is required.' });
    return;
  }

  const market = await marketContextService.getByCode(marketCode);
  if (!market) {
    res.status(404).json({ errorCode: 'MARKET_NOT_FOUND', message: `Unknown market: ${marketCode}` });
    return;
  }

  const filters = {
    category: req.query['category'] as string | undefined,
    brand: req.query['brand'] as string | undefined,
    priceMin: req.query['priceMin'] ? Number(req.query['priceMin']) : undefined,
    priceMax: req.query['priceMax'] ? Number(req.query['priceMax']) : undefined,
    storage: req.query['storage'] as string | undefined,
    inStock: req.query['inStock'] !== undefined ? req.query['inStock'] === 'true' : undefined,
  };

  const products = await catalogService.listProducts(market, filters);

  res.status(200).json({
    market: {
      code: market.code,
      currency: market.currency,
      taxRate: market.taxRate,
      taxLabel: market.taxLabel,
    },
    products,
  });
});

router.get('/products/:id', async (req: Request, res: Response) => {
  const marketCode = req.query['market'] as string | undefined;
  if (!marketCode) {
    res.status(400).json({ errorCode: 'MARKET_REQUIRED', message: 'Query parameter ?market is required.' });
    return;
  }

  const market = await marketContextService.getByCode(marketCode);
  if (!market) {
    res.status(404).json({ errorCode: 'MARKET_NOT_FOUND', message: `Unknown market: ${marketCode}` });
    return;
  }

  const product = await catalogService.getProduct(req.params['id'], market);
  if (!product) {
    res.status(404).json({ errorCode: 'PRODUCT_NOT_FOUND', message: `Product not found: ${req.params['id']}` });
    return;
  }

  res.status(200).json(product);
});

export default router;
