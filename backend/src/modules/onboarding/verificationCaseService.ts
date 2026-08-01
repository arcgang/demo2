import { randomUUID } from 'crypto';
import type { PortingInput } from './portingInput';
import { encryptPiiObject, decryptPiiObject } from '../encryption/fieldEncryption';

export interface KycStub {
  verificationReference: string;
  status: string;
  missingArtifacts: string[];
}

export interface VerificationCase {
  caseId: string;
  marketCode: string;
  status: 'pending_porting';
  portingData: Omit<PortingInput, 'marketCode'>;
  kycStub: KycStub;
}

// PII fields present in a PortingInput record.
const PORTING_PII_FIELDS = ['accountHolderName', 'accountNumber', 'idNumber'];

// In-memory store for the demo — no database wiring required for this task.
const store = new Map<string, VerificationCase>();

export function createPortingCase(input: PortingInput): VerificationCase {
  const caseId = `ver_${randomUUID()}`;
  const kycStub: KycStub = {
    verificationReference: `rica_${randomUUID()}`,
    status: 'pending',
    missingArtifacts: [],
  };

  const { marketCode, portingReference, ...portingData } = input;

  const encryptedPortingData = encryptPiiObject(
    { ...portingData, portingReference } as Record<string, unknown>,
    PORTING_PII_FIELDS,
  ) as Omit<PortingInput, 'marketCode'>;

  const record: VerificationCase = {
    caseId,
    marketCode,
    status: 'pending_porting',
    portingData: encryptedPortingData,
    kycStub,
  };

  store.set(caseId, record);

  // Return the record with PII decrypted so callers receive plaintext.
  return {
    ...record,
    portingData: decryptPiiObject(
      encryptedPortingData as Record<string, unknown>,
      PORTING_PII_FIELDS,
    ) as Omit<PortingInput, 'marketCode'>,
  };
}
