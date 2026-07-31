import express from 'express';
import marketsRouter from './modules/market-context/marketsRouter';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/markets', marketsRouter);
  return app;
}
