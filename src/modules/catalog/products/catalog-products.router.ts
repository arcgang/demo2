import { Router, Request, Response } from 'express';
import { listProducts, getProductBySlug } from './catalog-products.service';
import { catalogPlans } from '../plans/catalog-plans.fixture';

export const catalogProductsRouter = Router();

catalogProductsRouter.get('/products', (req: Request, res: Response) => {
  const category = typeof req.query['category'] === 'string' ? req.query['category'] : undefined;
  const page = Math.max(1, parseInt(typeof req.query['page'] === 'string' ? req.query['page'] : '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(typeof req.query['pageSize'] === 'string' ? req.query['pageSize'] : '50', 10) || 50));

  const all = listProducts(category);
  const total = all.length;
  const start = (page - 1) * pageSize;
  const paged = all.slice(start, start + pageSize);

  const products = paged.map((p) => {
    const item: Record<string, unknown> = {
      slug: p.slug,
      name: p.name,
      productType: p.productType,
      price: p.price,
      availability: p.availability,
      badges: p.badges,
      financingEligible: p.financingEligible,
      tradeInEligible: p.tradeInEligible,
    };
    if (p.productType === 'ACCESSORY') {
      item.compatibleDeviceFamilies = p.compatibleDeviceFamilies;
    }
    return item;
  });

  res.status(200).json({ products, total, page, pageSize });
});

catalogProductsRouter.get('/products/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  const product = getProductBySlug(slug);

  if (!product) {
    res.status(404).json({
      errorCode: 'PRODUCT_NOT_FOUND',
      message: `No product found with slug: ${slug}`,
      category: 'NotFound',
    });
    return;
  }

  const detail: Record<string, unknown> = {
    slug: product.slug,
    name: product.name,
    productType: product.productType,
    price: product.price,
    availability: product.availability,
    badges: product.badges,
    financingEligible: product.financingEligible,
    tradeInEligible: product.tradeInEligible,
    attachablePlans: product.attachablePlans,
    attachableBundles: product.attachableBundles,
  };

  if (product.productType === 'SIM' || product.productType === 'ESIM') {
    detail.verificationRequired = product.verificationRequired;
    detail.activationRequirements = product.activationRequirements;
  }

  if (product.productType === 'ACCESSORY') {
    detail.compatibilityCues = product.compatibilityCues;
  }

  res.status(200).json(detail);
});

catalogProductsRouter.get('/plans', (_req: Request, res: Response) => {
  res.status(200).json({ plans: catalogPlans });
});
