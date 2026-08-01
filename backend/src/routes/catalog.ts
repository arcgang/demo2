import { Router, Request, Response } from 'express';
import { getMarket } from '../modules/market/marketConfig';
import {
  getProductsForMarket,
  getProductById,
  getPlansForMarket,
  ProductSeed,
} from '../modules/catalog/catalogData';

const router = Router();

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

function isLiteMode(req: Request): boolean {
  return req.query.lite === 'true' || req.headers['save-data'] === 'on';
}

function computeMonthlyFrom(product: ProductSeed, planIndex: Map<string, ProductSeed>): number {
  if (product.productType === 'PLAN') return product.priceRecurring;
  if (product.compatiblePlanIds.length === 0) return 0;
  const prices = product.compatiblePlanIds
    .map(id => planIndex.get(id))
    .filter((p): p is ProductSeed => p !== undefined)
    .map(p => p.priceRecurring)
    .filter(r => r > 0);
  return prices.length > 0 ? Math.min(...prices) : 0;
}

function buildLiteItem(product: ProductSeed, currency: string, planIndex: Map<string, ProductSeed>): object {
  const meta = product.metadata as Record<string, unknown>;
  return {
    productId: product.productId,
    name: product.name,
    price: {
      ...(product.priceOnceOff > 0 ? { onceOff: product.priceOnceOff } : {}),
      ...(product.priceRecurring > 0 ? { recurring: product.priceRecurring } : {}),
      currency,
    },
    monthlyFrom: computeMonthlyFrom(product, planIndex),
    availability: product.availabilityStatus,
    category: product.productType,
    storageOptions: meta.storage ? [String(meta.storage)] : [],
    colorOptions: meta.colour ? [String(meta.colour)] : [],
    planAttachOptions: product.compatiblePlanIds,
    esim: meta.simType === 'ESIM',
    fiveG: product.badges.includes('5G'),
    tradeIn: product.badges.includes('Trade-In Eligible'),
  };
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

  const products = getProductsForMarket(marketCode, category);

  if (isLiteMode(req)) {
    const allPlans = getPlansForMarket(marketCode);
    const planIndex = new Map<string, ProductSeed>(allPlans.map(p => [p.productId, p]));
    res.status(200).json({
      market: {
        marketCode: market.marketCode,
        currency: market.currency,
      },
      catalog: products.map(p => buildLiteItem(p, market.currency, planIndex)),
    });
    return;
  }

  res.status(200).json({
    market: {
      marketCode: market.marketCode,
      currency: market.currency,
    },
    catalog: products.map(p =>
      buildCatalogItem(p, market.currency, market.vatRate, market.taxLabel, market.paymentMethods),
    ),
  });
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

  if (isLiteMode(req)) {
    const planIndex = new Map<string, ProductSeed>(plans.map(p => [p.productId, p]));
    res.status(200).json(buildLiteItem(product, currency, planIndex));
    return;
  }

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
