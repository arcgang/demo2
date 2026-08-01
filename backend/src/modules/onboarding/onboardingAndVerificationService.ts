import { emitAuditEvent } from '../consentAudit/consentAndAuditService';

export interface RunVerificationInput {
  orderRef: string;
  verificationCaseId: string;
  outcome: 'pass' | 'fail' | 'pending';
  providerCode: string;
}

export async function runVerification(input: RunVerificationInput): Promise<void> {
  try {
    await emitAuditEvent({
      type: 'verification_outcome',
      orderId: input.orderRef,
      payload: {
        verification_case_id: input.verificationCaseId,
        outcome: input.outcome,
        provider_code: input.providerCode,
      },
    });
  } catch (err) {
    console.error({ msg: 'emitAuditEvent failed in runVerification', err, orderRef: input.orderRef });
    throw err;
  }
}
