import { randomUUID } from 'crypto';

export type ConsentType = 'terms_and_privacy' | 'marketing' | 'personalization';

export const CONSENT_TYPES: readonly ConsentType[] = [
  'terms_and_privacy',
  'marketing',
  'personalization',
];

export interface StoredConsentRecord {
  id: string;
  userId: string | null;
  sessionId: string;
  consentType: ConsentType;
  granted: boolean;
  purposeDescription: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const store: StoredConsentRecord[] = [];

export function clearAll(): void {
  store.length = 0;
}

export function insertConsent(
  params: Omit<StoredConsentRecord, 'id' | 'createdAt'>,
): StoredConsentRecord {
  const record: StoredConsentRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...params,
  };
  store.push(record);
  return record;
}

export function findByUserId(userId: string): StoredConsentRecord[] {
  return store.filter((r) => r.userId === userId);
}
