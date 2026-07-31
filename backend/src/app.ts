import express, { Application } from 'express';
import ordersRouter from './routes/orders';
import onboardingRouter from './routes/onboarding';
import upgradeRouter from './routes/upgrade';
import journeysRouter from './routes/journeys';

export function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);
  app.use('/api/onboarding', onboardingRouter);
  app.use('/api/upgrade', upgradeRouter);
  app.use('/api/journeys', journeysRouter);
  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT ?? 3001;
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}
