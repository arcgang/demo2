import express, { Application } from 'express';
import ordersRouter from './routes/orders';
import marketsRouter from './routes/markets';
import catalogRouter from './routes/catalog';

export function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);
  app.use('/api/markets', marketsRouter);
  app.use('/api/catalog', catalogRouter);
  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT ?? 3001;
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}
