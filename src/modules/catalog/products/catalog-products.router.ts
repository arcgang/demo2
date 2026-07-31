import { Router, Request, Response } from 'express';
import { listProducts, getProductBySlug } from './catalog-products.service';
import { catalogPlans } from '../plans/catalog-plans.fixture';

export const catalogProductsRouter = Router();

catalogProductsRouter.get('/products', (req: Request, res: Response) => {
  const category = typeof req.query['category'] === 'string' ? req.query['category'] : undefined;
  const page = 1;
  const pageSize = 50;

  const products = listProducts(category);

  res.status(200).json({
    products,
    total: products.length,
    page,
    pageSize,
  });
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
    financingEligible: product.financingEligible,
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
