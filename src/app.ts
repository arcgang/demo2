import express, { Request, Response, NextFunction } from 'express';
import marketsRouter from './modules/market-context/marketsRouter';
import { upsellOffersRouter } from './modules/catalog/offers/upsell-offers.router';
import { catalogProductsRouter } from './modules/catalog/products/catalog-products.router';
import { catalogRouter } from './modules/catalog/catalog.router';
import { ordersRouter } from './modules/orders/orders.router';
import { upgradeRouter } from './modules/upgrade/upgrade.router';
import { apiOrdersRouter } from './modules/orders/api-orders.router';
import { checkoutConfirmationRouter } from './modules/orders/checkout-confirmation.router';
import { onboardingRouter } from './modules/onboarding/onboarding.router';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use('/api/markets', marketsRouter);
  app.use('/api/offers', upsellOffersRouter);
  app.use('/api/catalog', catalogProductsRouter);
  app.use('/api/orders', apiOrdersRouter);
  app.use('/orders', ordersRouter);
  app.use('/', upgradeRouter);
  app.use('/onboarding', onboardingRouter);
  app.use('/', checkoutConfirmationRouter);
  app.use('/', catalogRouter);
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' });
  });
  return app;
}

export const app = createApp();
