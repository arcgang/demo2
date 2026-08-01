import express, { Application } from 'express';
import ordersRouter from './routes/orders';
import onboardingRouter from './routes/onboarding';
import upgradeRouter from './routes/upgrade';
import journeysRouter from './routes/journeys';
import marketContextRouter from './routes/marketContext';
import catalogRouter from './routes/catalog';
import devicesRouter from './routes/devices';
import offerFitRouter from './routes/offerFit';
import cartsRouter from './routes/carts';

export function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);
  app.use('/api/onboarding', onboardingRouter);
  app.use('/api/upgrade', upgradeRouter);
  app.use('/api/journeys', journeysRouter);
  app.use('/api/market-context', marketContextRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/devices', devicesRouter);
  app.use('/api/offer-fit', offerFitRouter);
  app.use('/api/carts', cartsRouter);
  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT ?? 3001;
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}
