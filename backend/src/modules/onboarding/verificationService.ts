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

const store = new Map<string, VerificationCaseRecord>();
let counter = 1;

export async function createVerificationCase(input: CreateVerificationInput): Promise<VerificationCaseRecord> {
  const adapterResult = runKycRicaCheck(input.identityFields.idNumber);

  const record: VerificationCaseRecord = {
    id: `ver_${counter++}`,
    orderId: input.orderId,
    customerId: input.customerId,
    type: input.type,
    status: adapterResult.status as VerificationStatus,
    submittedAt: new Date(),
    resolvedAt: adapterResult.resolvedAt ?? null,
    identityFields: input.identityFields,
    auditRef: adapterResult.auditRef,
  };

  store.set(record.id, record);
  store.set(`order:${input.orderId}`, record);

  return record;
}

export async function getVerificationCaseByOrderId(orderId: string): Promise<VerificationCaseRecord | null> {
  return store.get(`order:${orderId}`) ?? null;
}
