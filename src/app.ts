import express, { Request, Response, NextFunction } from 'express';
import marketsRouter from './modules/market-context/marketsRouter';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/markets', marketsRouter);
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' });
  });
  return app;
}
