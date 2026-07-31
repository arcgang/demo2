import { randomUUID } from 'crypto';
import { runKycRicaCheck } from './kycRicaAdapter';

export type VerificationType = 'KYC' | 'RICA';
export type VerificationStatus = 'pending' | 'verified' | 'failed';

export interface IdentityFields {
  firstName: string;
  lastName: string;
  idNumber: string;
  addressLine1: string;
  city: string;
}

export interface VerificationCaseRecord {
  id: string;
  orderId: string;
  customerId: string;
  type: VerificationType;
  status: VerificationStatus;
  submittedAt: Date;
  resolvedAt: Date | null;
  identityFields: IdentityFields;
  auditRef: string;
}

export interface CreateVerificationInput {
  orderId: string;
  customerId: string;
  type: VerificationType;
  identityFields: IdentityFields;
}

// In-memory store indexed by orderId for GET lookups.
const storeById = new Map<string, VerificationCaseRecord>();
const storeByOrderId = new Map<string, VerificationCaseRecord>();

export function createVerificationCase(input: CreateVerificationInput): VerificationCaseRecord {
  const submittedAt = new Date();
  const adapterResult = runKycRicaCheck(input.identityFields.idNumber);

  const record: VerificationCaseRecord = {
    id: randomUUID(),
    orderId: input.orderId,
    customerId: input.customerId,
    type: input.type,
    status: adapterResult.status,
    submittedAt,
    resolvedAt: adapterResult.resolvedAt,
    identityFields: input.identityFields,
    auditRef: adapterResult.auditRef,
  };

  storeById.set(record.id, record);
  storeByOrderId.set(record.orderId, record);
  return record;
}

export function getVerificationCaseByOrderId(orderId: string): VerificationCaseRecord | undefined {
  return storeByOrderId.get(orderId);
}
