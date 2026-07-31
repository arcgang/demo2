import express, { Application } from 'express';
import ordersRouter from './routes/orders';
import onboardingRouter from './routes/onboarding';
import cartRouter from './routes/cart';

export function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/cart', cartRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/onboarding', onboardingRouter);
  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT ?? 3001;
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}
