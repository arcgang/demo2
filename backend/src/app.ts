import express, { Application } from 'express';
import ordersRouter from './routes/orders';
import checkoutRouter from './routes/checkout';
import onboardingRouter from './routes/onboarding';
import upgradeRouter from './routes/upgrade';
import journeysRouter from './routes/journeys';
import marketContextRouter from './routes/marketContext';
import catalogRouter from './routes/catalog';
import devicesRouter from './routes/devices';

export function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);
  app.use('/api/checkout', checkoutRouter);
  app.use('/api/onboarding', onboardingRouter);
  app.use('/api/upgrade', upgradeRouter);
  app.use('/api/journeys', journeysRouter);
  app.use('/api/market-context', marketContextRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/devices', devicesRouter);
  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT ?? 3001;
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}
