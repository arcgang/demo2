import express, { Application, Request, Response, NextFunction } from 'express';
import ordersRouter from './routes/orders';
import onboardingRouter from './routes/onboarding';
import upgradeRouter from './routes/upgrade';
import journeysRouter from './routes/journeys';
import { isHttpRedirectEnabled } from './config/tlsConfig';

// Redirect plain HTTP requests to HTTPS when running in production behind a
// TLS-terminating proxy that sets X-Forwarded-Proto.  Skipped outside
// production so developer tooling is not broken.
function httpsRedirectMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (
    isHttpRedirectEnabled() &&
    process.env.NODE_ENV === 'production' &&
    req.headers['x-forwarded-proto'] !== 'https'
  ) {
    res.redirect(301, `https://${req.headers.host}${req.url}`);
    return;
  }
  next();
}

export function createApp(): Application {
  const app = express();
  app.use(httpsRedirectMiddleware);
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
