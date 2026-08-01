import { PrismaClient } from '@prisma/client';
import { runKycRicaCheck } from './kycRicaAdapter';
import { encryptPiiObject, decryptPiiObject, SENSITIVE_PII_FIELDS } from '../encryption/fieldEncryption';

const prisma = new PrismaClient();

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

export async function createVerificationCase(input: CreateVerificationInput): Promise<VerificationCaseRecord> {
  const adapterResult = runKycRicaCheck(input.identityFields.idNumber);

  const encryptedFields = encryptPiiObject(
    input.identityFields as Record<string, unknown>,
    SENSITIVE_PII_FIELDS as string[],
  );

  const row = await prisma.verificationCase.create({
    data: {
      orderId: input.orderId,
      customerId: input.customerId,
      type: input.type,
      status: adapterResult.status,
      resolvedAt: adapterResult.resolvedAt,
      identityFields: encryptedFields as object,
      auditRef: adapterResult.auditRef,
    },
  });

  const decryptedFields = decryptPiiObject(
    row.identityFields as unknown as Record<string, unknown>,
    SENSITIVE_PII_FIELDS as string[],
  );

  return {
    id: row.id,
    orderId: row.orderId,
    customerId: row.customerId,
    type: row.type as VerificationType,
    status: row.status as VerificationStatus,
    submittedAt: row.submittedAt,
    resolvedAt: row.resolvedAt,
    identityFields: decryptedFields as unknown as IdentityFields,
    auditRef: row.auditRef,
  };
}

export async function getVerificationCaseByOrderId(orderId: string): Promise<VerificationCaseRecord | null> {
  const row = await prisma.verificationCase.findFirst({ where: { orderId } });
  if (!row) return null;

  const decryptedFields = decryptPiiObject(
    row.identityFields as unknown as Record<string, unknown>,
    SENSITIVE_PII_FIELDS as string[],
  );

  return {
    id: row.id,
    orderId: row.orderId,
    customerId: row.customerId,
    type: row.type as VerificationType,
    status: row.status as VerificationStatus,
    submittedAt: row.submittedAt,
    resolvedAt: row.resolvedAt,
    identityFields: decryptedFields as unknown as IdentityFields,
    auditRef: row.auditRef,
  };
}
