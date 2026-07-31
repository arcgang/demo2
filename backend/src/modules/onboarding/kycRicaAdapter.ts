import { randomUUID } from 'crypto';

export type AdapterVerificationStatus = 'verified' | 'failed';

export interface AdapterResult {
  status: AdapterVerificationStatus;
  auditRef: string;
  resolvedAt: Date;
}

/**
 * Mock KYC/RICA adapter.
 * Deterministically returns:
 *   - 'failed'   when idNumber starts with '000' (test-prefix)
 *   - 'verified' for all other well-formed inputs
 */
export function runKycRicaCheck(idNumber: string): AdapterResult {
  const status: AdapterVerificationStatus = idNumber.startsWith('000') ? 'failed' : 'verified';
  return {
    status,
    auditRef: `rica_${randomUUID()}`,
    resolvedAt: new Date(),
  };
}
