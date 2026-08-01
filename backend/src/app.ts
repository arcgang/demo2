import express, { Application } from 'express';
import ordersRouter from './routes/orders';
import upgradeRouter from './routes/upgrade';
import cartsRouter from './routes/carts';
import onboardingRouter from './routes/onboarding';
import journeysRouter from './routes/journeys';
import marketContextRouter from './routes/marketContext';
import catalogRouter from './routes/catalog';
import devicesRouter from './routes/devices';
import consentRouter from './routes/consent';

export function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);
  app.use('/api/upgrade', upgradeRouter);
  app.use('/api/carts', cartsRouter);
  app.use('/api/onboarding', onboardingRouter);
  app.use('/api/journeys', journeysRouter);
  app.use('/api/market-context', marketContextRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/devices', devicesRouter);
  app.use('/api/consent', consentRouter);
  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT ?? 3001;
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}
