import { TlsOptions } from 'tls';

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

const DISABLED_CIPHERS: string[] = [
  '!RC4',
  '!DES-CBC3-SHA',
  '!3DES',
  '!DES',
  '!EXPORT',
  '!NULL',
  '!aNULL',
  '!eNULL',
  '!MD5',
  '!SSLv2',
  '!SSLv3',
];

export function getTlsOptions(): TlsOptions & { minVersion: string; ciphers: string; honorCipherOrder: boolean } {
  return {
    minVersion: 'TLSv1.2',
    ciphers: CIPHER_STRING,
    honorCipherOrder: true,
  };
}

export function getDisabledCiphers(): string[] {
  return [...DISABLED_CIPHERS];
}

export function isHttpRedirectEnabled(): boolean {
  return true;
}

export function getTlsCertPath(): string | undefined {
  return process.env.TLS_CERT_PATH ?? process.env.TLS_CERT;
}

export function getTlsKeyPath(): string | undefined {
  return process.env.TLS_KEY_PATH ?? process.env.TLS_KEY;
}
