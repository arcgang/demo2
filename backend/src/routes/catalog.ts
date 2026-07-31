import { Router, Request, Response } from 'express';
import { getMarket } from '../modules/market/marketConfig';
import {
  getProductsForMarket,
  getProductById,
  getPlansForMarket,
  ProductSeed,
} from '../modules/catalog/catalogData';

const router = Router();

function computeTax(priceOnceOff: number, priceRecurring: number, vatRate: number) {
  const taxableAmount = priceOnceOff > 0 ? priceOnceOff : priceRecurring;
  return {
    taxLabel: 'VAT',
    taxAmount: parseFloat((taxableAmount * vatRate).toFixed(2)),
    taxRate: vatRate,
  };
}

function isPurchasable(product: ProductSeed, paymentMethods: string[]): boolean {
  if (product.requiresPaymentMethod) {
    return paymentMethods.includes(product.requiresPaymentMethod);
  }
  return product.availabilityStatus === 'AVAILABLE';
}

function buildCatalogItem(product: ProductSeed, currency: string, vatRate: number, paymentMethods: string[]) {
  const tax = computeTax(product.priceOnceOff, product.priceRecurring, vatRate);
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

  res.status(200).json({
    market: {
      marketCode: market.marketCode,
      currency: market.currency,
    },
    catalog: products.map(p =>
      buildCatalogItem(p, market.currency, market.vatRate, market.paymentMethods),
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

  const resolvedMarketCode = marketCode ?? product.marketCode;
  const market = getMarket(resolvedMarketCode);
  const currency = market ? market.currency : 'ZAR';
  const vatRate = market ? market.vatRate : 0.15;
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

  const tax = computeTax(product.priceOnceOff, product.priceRecurring, vatRate);

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
      taxLabel: market ? market.taxLabel : 'VAT',
      taxAmount: tax.taxAmount,
      taxRate: tax.taxRate,
      inclusive: false,
    },
    marketAvailability: [product.marketCode],
    compatibleOffers,
    onboardingRequirements: product.onboardingRequirements,
    recommendedAccessories: [],
    isPurchasable: isPurchasable(product, paymentMethods),
    badges: product.badges,
  });
});

export default router;
