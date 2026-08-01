import { TlsOptions } from 'tls';
import * as https from 'https';
import * as fs from 'fs';
import { Application } from 'express';

// Overridable via HTTP_REDIRECT_ENABLED=false for environments where redirect is
// handled upstream (e.g. a load balancer that already enforces HTTPS).
export function isHttpRedirectEnabled(): boolean {
  return process.env.HTTP_REDIRECT_ENABLED !== 'false';
}

// TLS cipher suite: HIGH-strength ciphers only; explicitly exclude weak algorithms.
// RC4, 3DES (DES-CBC3), export-grade (EXP/EXPORT), NULL, aNULL, eNULL, MD5, and
// the deprecated SSLv2/SSLv3 cipher groups are all disabled via OpenSSL negation.
const CIPHER_STRING = [
  'HIGH',
  '!RC4',
  '!DES-CBC3-SHA',
  '!3DES',
  '!DES',
  '!EXPORT',
  '!NULL',
  '!aNULL',
  '!eNULL',
  '!MD5',
  '!ADH',
  '!AECDH',
  '!LOW',
  '!SSLv2',
  '!SSLv3',
].join(':');

// Derived from CIPHER_STRING to stay in sync — parse the negation tokens.
export function getDisabledCiphers(): string[] {
  return CIPHER_STRING.split(':').filter((c) => c.startsWith('!'));
}

export function getTlsOptions(): TlsOptions & { minVersion: string; ciphers: string; honorCipherOrder: boolean } {
  return {
    minVersion: 'TLSv1.2',
    ciphers: CIPHER_STRING,
    honorCipherOrder: true,
  };
}

export function getTlsCertPath(): string | undefined {
  return process.env.TLS_CERT_PATH ?? process.env.TLS_CERT;
}

export function getTlsKeyPath(): string | undefined {
  return process.env.TLS_KEY_PATH ?? process.env.TLS_KEY;
}

/**
 * Create an HTTPS server when TLS_CERT_PATH and TLS_KEY_PATH are provided,
 * otherwise fall back to plain HTTP (development only).
 */
export function createServer(app: Application, port: string | number): void {
  const certPath = getTlsCertPath();
  const keyPath = getTlsKeyPath();

  if (certPath && keyPath) {
    const tlsOpts = {
      ...getTlsOptions(),
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    };
    https.createServer(tlsOpts, app).listen(port, () => {
      console.log(`Backend listening on port ${port} (HTTPS, TLS 1.2+)`);
    });
  } else {
    // No cert/key — acceptable in local development; must not reach production.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'TLS_CERT_PATH and TLS_KEY_PATH must be set in production. ' +
        'Refusing to start without TLS.',
      );
    }
    app.listen(port, () => {
      console.log(`Backend listening on port ${port} (HTTP — development only)`);
    });
  }
}
