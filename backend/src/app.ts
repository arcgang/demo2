import express, { Application, Request, Response, NextFunction } from 'express';
import ordersRouter from './routes/orders';
import onboardingRouter from './routes/onboarding';
import upgradeRouter from './routes/upgrade';
import journeysRouter from './routes/journeys';
import marketContextRouter from './routes/marketContext';
import catalogRouter from './routes/catalog';
import devicesRouter from './routes/devices';
import checkoutRouter from './routes/checkout';
import { buildStructuredError } from './modules/errorClassification/errorSchema';

export function createApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);
  app.use('/api/onboarding', onboardingRouter);
  app.use('/api/upgrade', upgradeRouter);
  app.use('/api/journeys', journeysRouter);
  app.use('/api/market-context', marketContextRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/devices', devicesRouter);
  app.use('/api/checkout', checkoutRouter);

  // Global error handler — catches any unhandled throw from route handlers and
  // ensures the structured error contract is upheld on all 5xx paths.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    res.status(500).json(
      buildStructuredError('support_required', {
        errorCode: 'INTERNAL_SERVER_ERROR',
        message,
      }),
    );
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT ?? 3001;
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}
