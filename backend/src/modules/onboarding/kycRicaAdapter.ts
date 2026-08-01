import { randomUUID } from 'crypto';

export type AdapterVerificationStatus = 'verified' | 'failed';

export interface AdapterResult {
  status: AdapterVerificationStatus;
  auditRef: string;
  resolvedAt: Date;
}

/**
 * Sentinel prefix for the mock KYC/RICA adapter.
 * Any idNumber starting with this prefix triggers a 'failed' outcome.
 * Tests that exercise the kyc_failed scenario must use this constant rather
 * than hard-coding the string, keeping adapter and test contract in sync.
 */
export const KYC_FAIL_ID_PREFIX = '000';

/**
 * Mock KYC/RICA adapter.
 * Deterministically returns:
 *   - 'failed'   when idNumber starts with KYC_FAIL_ID_PREFIX
 *   - 'verified' for all other well-formed inputs
 */
export function runKycRicaCheck(idNumber: string): AdapterResult {
  const status: AdapterVerificationStatus = idNumber.startsWith(KYC_FAIL_ID_PREFIX) ? 'failed' : 'verified';
  return {
    status,
    auditRef: `rica_${randomUUID()}`,
    resolvedAt: new Date(),
  };
}
