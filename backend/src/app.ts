import express, { Application } from 'express';
import ordersRouter from './routes/orders';
import upgradeRouter from './routes/upgrade';
import cartsRouter from './routes/carts';

export function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);
  app.use('/api/upgrade', upgradeRouter);
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
