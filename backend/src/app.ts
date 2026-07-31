import express, { Application } from 'express';
import ordersRouter from './routes/orders';
import catalogRouter from './routes/catalog';
import onboardingRouter from './routes/onboarding';
import activationRouter from './routes/activation';

export function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/onboarding', onboardingRouter);
  app.use('/api/activation', activationRouter);
  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT ?? 3001;
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}
