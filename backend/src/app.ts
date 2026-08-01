import express, { Application, Request, Response, NextFunction } from 'express';
import ordersRouter from './routes/orders';
import onboardingRouter from './routes/onboarding';
import upgradeRouter from './routes/upgrade';
import journeysRouter from './routes/journeys';
import { createServer, isHttpRedirectEnabled } from './config/tlsConfig';

// Redirect plain HTTP requests to HTTPS when running in production behind a
// TLS-terminating proxy that sets X-Forwarded-Proto.  Skipped outside
// production so developer tooling is not broken.
function httpsRedirectMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (
    isHttpRedirectEnabled() &&
    process.env.NODE_ENV === 'production' &&
    req.headers['x-forwarded-proto'] !== 'https'
  ) {
    // Use a known-good hostname from config rather than the user-supplied Host
    // header, which can be spoofed to redirect victims to an attacker-controlled domain.
    const host = process.env.APP_HOSTNAME;
    if (!host) {
      // APP_HOSTNAME must be set in production so we have a safe redirect target
      // that cannot be spoofed via the Host header. Fail loudly — same posture
      // as the TLS cert/key guard in createServer.
      throw new Error(
        'APP_HOSTNAME environment variable is not set. ' +
        'Cannot perform HTTP→HTTPS redirect without a trusted hostname.',
      );
    }
    res.redirect(301, `https://${host}${req.url}`);
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
  createServer(app, port);
}
