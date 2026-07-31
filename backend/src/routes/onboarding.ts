import { Router, Request, Response } from 'express';
import { validatePortingInput } from '../modules/onboarding/portingInput';
import { isPortingSupported } from '../modules/onboarding/marketPortingConfig';
import { createPortingCase } from '../modules/onboarding/verificationCaseService';

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

export default router;
