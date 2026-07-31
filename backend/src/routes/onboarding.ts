import { Router, Request, Response } from 'express';
import { validatePortingInput } from '../modules/onboarding/portingInput';
import { isPortingSupported } from '../modules/onboarding/marketPortingConfig';
import { createPortingCase } from '../modules/onboarding/verificationCaseService';
import { validateVerificationInput } from '../modules/onboarding/verificationInput';
import {
  createVerificationCase,
  getVerificationCaseByOrderId,
  type VerificationType,
  type IdentityFields,
} from '../modules/onboarding/verificationService';

const router = Router();

router.post('/porting', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  const errors = validatePortingInput(body);
  if (errors.length > 0) {
    res.status(422).json({ errorCode: 'VALIDATION_ERROR', errors });
    return;
  }

  const marketCode = body.marketCode as string;
  if (!isPortingSupported(marketCode)) {
    res.status(403).json({
      errorCode: 'PORTING_NOT_SUPPORTED',
      message: `Porting is not supported in market "${marketCode}".`,
    });
    return;
  }

  const record = createPortingCase({
    marketCode,
    donorNetwork: body.donorNetwork as string,
    accountHolderName: body.accountHolderName as string,
    accountNumber: body.accountNumber as string,
    idNumber: body.idNumber as string,
    portingReference: body.portingReference as string | undefined,
  });

  res.status(201).json({
    caseId: record.caseId,
    status: record.status,
    kycStub: record.kycStub,
  });
});

router.post('/verification', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  const errors = validateVerificationInput(body);
  if (errors.length > 0) {
    res.status(422).json({ errorCode: 'VALIDATION_ERROR', errors });
    return;
  }

  const record = await createVerificationCase({
    orderId: body.orderId as string,
    customerId: body.customerId as string,
    type: body.type as VerificationType,
    identityFields: body.identityFields as IdentityFields,
  });

  res.status(201).json({
    id: record.id,
    orderId: record.orderId,
    customerId: record.customerId,
    type: record.type,
    status: record.status,
    submittedAt: record.submittedAt.toISOString(),
    resolvedAt: record.resolvedAt ? record.resolvedAt.toISOString() : null,
    identityFields: record.identityFields,
    auditRef: record.auditRef,
  });
});

router.get('/verification/:orderId', async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const record = await getVerificationCaseByOrderId(orderId);

  if (!record) {
    res.status(404).json({
      errorCode: 'VERIFICATION_CASE_NOT_FOUND',
      message: `No verification case found for orderId "${orderId}".`,
    });
    return;
  }

  res.status(200).json({
    id: record.id,
    orderId: record.orderId,
    customerId: record.customerId,
    type: record.type,
    status: record.status,
    submittedAt: record.submittedAt.toISOString(),
    resolvedAt: record.resolvedAt ? record.resolvedAt.toISOString() : null,
    identityFields: record.identityFields,
    auditRef: record.auditRef,
  });
});

export default router;
