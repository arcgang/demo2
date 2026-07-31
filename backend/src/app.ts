import express, { Application } from 'express';
import ordersRouter from './routes/orders';
import { tradeInRouter, cartTradeInRouter } from './routes/tradeIn';

export function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);
  app.use('/api/trade-in', tradeInRouter);
  app.use('/api/cart', cartTradeInRouter);
  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT ?? 3001;
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}
