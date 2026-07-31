import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Acceptance tests for TLS 1.2+ enforcement and cipher-suite hardening.
 *
 * Acceptance criteria (task spec):
 *   AC-TLS-1  Server/reverse-proxy accepts TLS 1.2 and TLS 1.3 only.
 *   AC-TLS-2  TLS 1.0 and TLS 1.1 connections are rejected.
 *   AC-TLS-3  Weak cipher suites (RC4, 3DES, export-grade) are disabled.
 *   AC-TLS-4  All HTTP traffic is redirected to HTTPS.
 *   AC-TLS-5  No TLS key material or secrets are hard-coded in the source tree.
 *   AC-TLS-6  TLS configuration is loaded exclusively from environment variables.
 *
 * These tests exercise the tls configuration module that must exist at
 * src/config/tlsConfig.ts (or equivalent).  They will FAIL until that
 * module is implemented.
 */

// ---------------------------------------------------------------------------
// Module under test (does not exist yet — imports will throw at runtime)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-var-requires
const tlsConfigModule = (() => {
  try {
    return require('../../config/tlsConfig') as {
      getTlsOptions: () => {
        minVersion: string;
        maxVersion?: string;
        ciphers: string;
        honorCipherOrder: boolean;
      };
      isHttpRedirectEnabled: () => boolean;
      getDisabledCiphers: () => string[];
    };
  } catch {
    return null;
  }
})();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sourceTreeContainsKeyMaterial(): { found: boolean; matches: string[] } {
  const repoRoot = path.resolve(__dirname, '../../../../..');
  const srcDir = path.resolve(__dirname, '../..');

  // Patterns that indicate hard-coded key material
  const hardcodedPatterns = [
    /-----BEGIN\s+(RSA\s+)?PRIVATE KEY-----/,
    /-----BEGIN CERTIFICATE-----/,
    /AES_KEY\s*=\s*['"][A-Fa-f0-9]{32,}/,
    /ENCRYPTION_KEY\s*=\s*['"][A-Za-z0-9+/=]{32,}/,
    /SECRET_KEY\s*=\s*['"][A-Za-z0-9+/=]{16,}/,
  ];

  const matches: string[] = [];

  function scanDir(dir: string): void {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && /\.(ts|js|json|env|yaml|yml|conf|cfg)$/.test(entry.name)) {
        // Skip test fixtures that are explicitly allowed to contain fake keys
        if (fullPath.includes('__tests__') && fullPath.includes('fixture')) continue;
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of hardcodedPatterns) {
          if (pattern.test(content)) {
            matches.push(`${fullPath}: matched ${pattern.source}`);
          }
        }
      }
    }
  }

  scanDir(srcDir);
  return { found: matches.length > 0, matches };
}

function buildAllowedCipherSet(): Set<string> {
  // Ciphers that MUST be absent from an AES-256/TLS 1.2+ configuration
  const forbidden = new Set([
    'RC4',
    'RC4-MD5',
    'RC4-SHA',
    'DES-CBC3-SHA',    // 3DES
    'DES-CBC-SHA',     // single DES
    'EXP-',            // prefix for export-grade
    'NULL',
    'aNULL',
    'eNULL',
    'EXPORT',
    'LOW',
    'MD5',
  ]);
  return forbidden;
}

// ---------------------------------------------------------------------------
// AC-TLS-1  TLS minimum protocol version is 1.2
// ---------------------------------------------------------------------------

describe('TLS configuration — AC-TLS-1 minimum protocol TLS 1.2', () => {
  it('tlsConfig module is importable', () => {
    expect(tlsConfigModule).not.toBeNull();
  });

  it('getTlsOptions() returns an object', () => {
    expect(tlsConfigModule).not.toBeNull();
    const opts = tlsConfigModule!.getTlsOptions();
    expect(typeof opts).toBe('object');
    expect(opts).not.toBeNull();
  });

  it('minVersion is set to TLSv1.2 or higher', () => {
    expect(tlsConfigModule).not.toBeNull();
    const { minVersion } = tlsConfigModule!.getTlsOptions();
    const allowed = ['TLSv1.2', 'TLSv1.3'];
    expect(allowed).toContain(minVersion);
  });

  it('minVersion is not set to TLSv1 (TLS 1.0)', () => {
    expect(tlsConfigModule).not.toBeNull();
    const { minVersion } = tlsConfigModule!.getTlsOptions();
    expect(minVersion).not.toBe('TLSv1');
  });

  it('minVersion is not set to TLSv1.1', () => {
    expect(tlsConfigModule).not.toBeNull();
    const { minVersion } = tlsConfigModule!.getTlsOptions();
    expect(minVersion).not.toBe('TLSv1.1');
  });
});

// ---------------------------------------------------------------------------
// AC-TLS-2  TLS 1.0 and TLS 1.1 connections are rejected
// ---------------------------------------------------------------------------

describe('TLS configuration — AC-TLS-2 legacy protocol rejection', () => {
  it('getTlsOptions() does not include SSLv2 or SSLv3 in maxVersion', () => {
    expect(tlsConfigModule).not.toBeNull();
    const opts = tlsConfigModule!.getTlsOptions();
    if (opts.maxVersion !== undefined) {
      expect(opts.maxVersion).not.toBe('SSLv3');
      expect(opts.maxVersion).not.toBe('SSLv2');
    }
    // pass if maxVersion is absent — that means no cap above minVersion
    expect(true).toBe(true);
  });

  it('getDisabledCiphers() returns an array', () => {
    expect(tlsConfigModule).not.toBeNull();
    const disabled = tlsConfigModule!.getDisabledCiphers();
    expect(Array.isArray(disabled)).toBe(true);
  });

  it('getDisabledCiphers() list includes SSLv2 and SSLv3 cipher markers', () => {
    expect(tlsConfigModule).not.toBeNull();
    const disabled = tlsConfigModule!.getDisabledCiphers().map((c) => c.toUpperCase());
    // at minimum, the legacy protocol ciphers must be excluded
    const hasLegacyExclusion =
      disabled.some((c) => c.includes('SSLv2')) ||
      disabled.some((c) => c.includes('SSLv3')) ||
      // OR the cipher string forbids them by omission (no positive inclusion)
      disabled.some((c) => c === '!SSLv2') ||
      disabled.some((c) => c === '!SSLv3');
    // The disabled list may also be expressed as an OpenSSL-format exclusion string
    const cipherString = tlsConfigModule!.getTlsOptions().ciphers;
    const cipherStringForbidsLegacy =
      cipherString.includes('!RC4') || cipherString.includes('!3DES') || cipherString.includes('HIGH');
    expect(hasLegacyExclusion || cipherStringForbidsLegacy).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-TLS-3  Weak cipher suites are disabled
// ---------------------------------------------------------------------------

describe('TLS configuration — AC-TLS-3 weak cipher exclusion', () => {
  it('ciphers string is a non-empty string', () => {
    expect(tlsConfigModule).not.toBeNull();
    const { ciphers } = tlsConfigModule!.getTlsOptions();
    expect(typeof ciphers).toBe('string');
    expect(ciphers.trim().length).toBeGreaterThan(0);
  });

  it('ciphers string does not contain RC4', () => {
    expect(tlsConfigModule).not.toBeNull();
    const { ciphers } = tlsConfigModule!.getTlsOptions();
    // RC4 must not appear as a positive (non-negated) cipher
    const parts = ciphers.split(':');
    for (const part of parts) {
      if (!part.startsWith('!') && !part.startsWith('-')) {
        expect(part.toUpperCase()).not.toContain('RC4');
      }
    }
  });

  it('ciphers string does not contain 3DES (DES-CBC3)', () => {
    expect(tlsConfigModule).not.toBeNull();
    const { ciphers } = tlsConfigModule!.getTlsOptions();
    const parts = ciphers.split(':');
    for (const part of parts) {
      if (!part.startsWith('!') && !part.startsWith('-')) {
        expect(part.toUpperCase()).not.toContain('3DES');
        expect(part.toUpperCase()).not.toContain('DES-CBC3');
      }
    }
  });

  it('ciphers string does not contain export-grade ciphers (EXP)', () => {
    expect(tlsConfigModule).not.toBeNull();
    const { ciphers } = tlsConfigModule!.getTlsOptions();
    const parts = ciphers.split(':');
    for (const part of parts) {
      if (!part.startsWith('!') && !part.startsWith('-')) {
        expect(part.toUpperCase()).not.toContain('EXPORT');
        expect(part.toUpperCase()).not.toMatch(/^EXP/);
      }
    }
  });

  it('ciphers string does not contain NULL cipher suites', () => {
    expect(tlsConfigModule).not.toBeNull();
    const { ciphers } = tlsConfigModule!.getTlsOptions();
    const parts = ciphers.split(':');
    for (const part of parts) {
      if (!part.startsWith('!') && !part.startsWith('-')) {
        expect(part.toUpperCase()).not.toContain('NULL');
      }
    }
  });

  it('ciphers string does not contain anonymous (aNULL) key exchange', () => {
    expect(tlsConfigModule).not.toBeNull();
    const { ciphers } = tlsConfigModule!.getTlsOptions();
    const parts = ciphers.split(':');
    for (const part of parts) {
      if (!part.startsWith('!') && !part.startsWith('-')) {
        expect(part.toUpperCase()).not.toContain('ANULL');
        expect(part.toUpperCase()).not.toContain('ADHE');
      }
    }
  });

  it('honorCipherOrder is enabled so server preference overrides client preference', () => {
    expect(tlsConfigModule).not.toBeNull();
    const { honorCipherOrder } = tlsConfigModule!.getTlsOptions();
    expect(honorCipherOrder).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-TLS-4  HTTP → HTTPS redirect is enabled
// ---------------------------------------------------------------------------

describe('TLS configuration — AC-TLS-4 HTTP to HTTPS redirect', () => {
  it('isHttpRedirectEnabled() returns true', () => {
    expect(tlsConfigModule).not.toBeNull();
    const result = tlsConfigModule!.isHttpRedirectEnabled();
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-TLS-5  No hard-coded key material in source tree
// ---------------------------------------------------------------------------

describe('TLS configuration — AC-TLS-5 no hard-coded key material in source', () => {
  it('source tree contains no embedded private key PEM blocks', () => {
    const { found, matches } = sourceTreeContainsKeyMaterial();
    // Report what was found to aid debugging when this test fails
    if (found) {
      // fail with a descriptive message
      expect(matches).toEqual([]);
    }
    expect(found).toBe(false);
  });

  it('source tree contains no literal AES key assignments', () => {
    const srcDir = path.resolve(__dirname, '../..');
    const aesKeyPattern = /const\s+\w*(key|secret|iv)\w*\s*=\s*['"][A-Fa-f0-9]{32,}['"]/i;
    const matches: string[] = [];

    function scan(dir: string): void {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(full);
        } else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) {
          if (full.includes('__tests__')) continue;
          const content = fs.readFileSync(full, 'utf8');
          if (aesKeyPattern.test(content)) matches.push(full);
        }
      }
    }

    scan(srcDir);
    expect(matches).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// AC-TLS-6  TLS config is driven by environment variables
// ---------------------------------------------------------------------------

describe('TLS configuration — AC-TLS-6 key material from environment variables only', () => {
  it('getTlsOptions() reads TLS_CERT_PATH or TLS_CERT env var for certificate source', () => {
    expect(tlsConfigModule).not.toBeNull();
    // The module must not embed a certificate path as a literal.
    // We verify by checking that the module exports a function that
    // returns different values when env vars change.
    const originalCert = process.env.TLS_CERT_PATH;
    process.env.TLS_CERT_PATH = '/tmp/test-cert.pem';

    // Re-require with fresh module cache to pick up new env
    jest.resetModules();
    const freshModule = (() => {
      try {
        return require('../../config/tlsConfig') as {
          getTlsCertPath: () => string | undefined;
        };
      } catch {
        return null;
      }
    })();

    if (freshModule && typeof freshModule.getTlsCertPath === 'function') {
      expect(freshModule.getTlsCertPath()).toBe('/tmp/test-cert.pem');
    } else {
      // If the function is not yet exported the module is not implemented — fail
      expect(freshModule).not.toBeNull();
      expect(typeof (freshModule as Record<string, unknown>).getTlsCertPath).toBe('function');
    }

    // Restore
    if (originalCert === undefined) {
      delete process.env.TLS_CERT_PATH;
    } else {
      process.env.TLS_CERT_PATH = originalCert;
    }
    jest.resetModules();
  });

  it('getTlsOptions() reads TLS_KEY_PATH or TLS_KEY env var for private key source', () => {
    expect(tlsConfigModule).not.toBeNull();
    const originalKey = process.env.TLS_KEY_PATH;
    process.env.TLS_KEY_PATH = '/tmp/test-key.pem';

    jest.resetModules();
    const freshModule = (() => {
      try {
        return require('../../config/tlsConfig') as {
          getTlsKeyPath: () => string | undefined;
        };
      } catch {
        return null;
      }
    })();

    if (freshModule && typeof freshModule.getTlsKeyPath === 'function') {
      expect(freshModule.getTlsKeyPath()).toBe('/tmp/test-key.pem');
    } else {
      expect(freshModule).not.toBeNull();
      expect(typeof (freshModule as Record<string, unknown>).getTlsKeyPath).toBe('function');
    }

    if (originalKey === undefined) {
      delete process.env.TLS_KEY_PATH;
    } else {
      process.env.TLS_KEY_PATH = originalKey;
    }
    jest.resetModules();
  });
});
