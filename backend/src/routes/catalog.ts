import { Router, Request, Response } from 'express';
import { getMarket } from '../modules/market/marketConfig';
import {
  getProductsForMarket,
  getProductById,
  getPlansForMarket,
  ProductSeed,
} from '../modules/catalog/catalogData';
import { makeCacheKey, getCached, setCached } from '../modules/shared/responseCache';

const router = Router();

const CATALOG_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

function computeTax(priceOnceOff: number, priceRecurring: number, vatRate: number, taxLabel: string) {
  const taxableAmount = priceOnceOff > 0 ? priceOnceOff : priceRecurring;
  return {
    taxLabel,
    taxAmount: parseFloat((taxableAmount * vatRate).toFixed(2)),
    taxRate: vatRate,
  };
}

function isPurchasable(product: ProductSeed, paymentMethods: string[]): boolean {
  if (product.availabilityStatus !== 'AVAILABLE') return false;
  if (product.requiresPaymentMethod) {
    return paymentMethods.includes(product.requiresPaymentMethod);
  }
  return true;
}

function buildCatalogItem(product: ProductSeed, currency: string, vatRate: number, taxLabel: string, paymentMethods: string[]) {
  const tax = computeTax(product.priceOnceOff, product.priceRecurring, vatRate, taxLabel);
  return {
    productId: product.productId,
    productType: product.productType,
    name: product.name,
    price: {
      ...(product.priceOnceOff > 0 ? { onceOff: product.priceOnceOff } : {}),
      ...(product.priceRecurring > 0 ? { recurring: product.priceRecurring } : {}),
      currency,
    },
    tax,
    isPurchasable: isPurchasable(product, paymentMethods),
    ...(product.compatiblePlanIds.length > 0 ? { availableAttachments: product.compatiblePlanIds } : {}),
    ...(product.badges.length > 0 ? { badges: product.badges } : {}),
  };
}

// GET /api/catalog/products
router.get('/products', (req: Request, res: Response) => {
  const marketCode = req.query.market as string | undefined;
  const category = req.query.category as string | undefined;

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

  const cacheKey = makeCacheKey('catalog:products', {
    market: market.marketCode,
    category: category ?? '',
  });

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

  const products = getProductsForMarket(marketCode, category);
  const body = {
    market: {
      marketCode: market.marketCode,
      currency: market.currency,
    },
    catalog: products.map(p =>
      buildCatalogItem(p, market.currency, market.vatRate, market.taxLabel, market.paymentMethods),
    ),
  };

  const entry = setCached(cacheKey, body, CATALOG_CACHE_CONTROL);
  res.set('Cache-Control', entry.cacheControl);
  res.set('ETag', entry.etag);
  if (req.headers['if-none-match'] === entry.etag) {
    res.status(304).end();
    return;
  }
  res.status(200).json(body);
});

// GET /api/catalog/products/:id
router.get('/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const marketCode = req.query.market as string | undefined;

  const product = getProductById(id);
  if (!product) {
    res.status(404).json({
      errorCode: 'PRODUCT_NOT_FOUND',
      message: `Product "${id}" was not found.`,
    });
    return;
  }

  if (marketCode && marketCode.toUpperCase() !== product.marketCode.toUpperCase()) {
    res.status(404).json({
      errorCode: 'PRODUCT_NOT_IN_MARKET',
      message: `Product "${id}" is not available in market "${marketCode}".`,
    });
    return;
  }

  const market = getMarket(product.marketCode);
  const currency = market ? market.currency : 'ZAR';
  const vatRate = market ? market.vatRate : 0.15;
  const taxLabel = market ? market.taxLabel : 'VAT';
  const paymentMethods = market ? market.paymentMethods : ['CARD_TOKEN'];

  const plans = getPlansForMarket(product.marketCode);
  const compatibleOffers = plans
    .filter(plan => product.compatiblePlanIds.includes(plan.productId))
    .map(plan => ({
      productId: plan.productId,
      name: plan.name,
      price: {
        ...(plan.priceRecurring > 0 ? { recurring: plan.priceRecurring } : {}),
        currency,
      },
    }));

  const tax = computeTax(product.priceOnceOff, product.priceRecurring, vatRate, taxLabel);

  res.status(200).json({
    productId: product.productId,
    productType: product.productType,
    name: product.name,
    price: {
      ...(product.priceOnceOff > 0 ? { onceOff: product.priceOnceOff } : {}),
      ...(product.priceRecurring > 0 ? { recurring: product.priceRecurring } : {}),
      currency,
    },
    tax: {
      taxLabel,
      taxAmount: tax.taxAmount,
      taxRate: tax.taxRate,
      inclusive: false,
    },
    spec: product.metadata,
    marketAvailability: [product.marketCode],
    compatibleOffers,
    onboardingRequirements: product.onboardingRequirements,
    recommendedAccessories: [],
    isPurchasable: isPurchasable(product, paymentMethods),
    badges: product.badges,
  });
});

export default router;
