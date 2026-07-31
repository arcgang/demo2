import { randomUUID } from 'crypto';
import type { PortingInput } from './portingInput';

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

  const record: VerificationCase = {
    caseId,
    marketCode,
    status: 'pending_porting',
    portingData: { ...portingData, portingReference },
    kycStub,
  };

  store.set(caseId, record);
  return record;
}
