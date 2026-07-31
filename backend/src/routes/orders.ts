import { Router, Request, Response } from 'express';
import { buildStatusResponse } from '../modules/activation/statusScenarios';
import { issueEsim } from '../modules/activation/activationOrchestrationService';
import { getPaymentAttemptByOrderId } from '../modules/payment/paymentStore';

const router = Router();

const orderStatusStore = new Map<string, string>();

router.post('/:id/advance', (req: Request, res: Response) => {
  const { id } = req.params;

  const attempt = getPaymentAttemptByOrderId(id);

  if (!attempt || attempt.status !== 'success') {
    res.status(402).json({
      errorCode: 'PAYMENT_REQUIRED',
      message: 'Payment must be successfully completed before the order can advance.',
    });
    return;
  }

  orderStatusStore.set(id, 'confirmed');
  res.status(200).json({ orderId: id, orderStatus: 'confirmed' });
});

router.post('/:id/esim/issue', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = issueEsim(id);

  switch (result.outcome) {
    case 'NOT_FOUND':
      res.status(404).json({ errorCode: 'ORDER_NOT_FOUND', message: 'Order not found.' });
      return;
    case 'PAYMENT_PENDING':
      res.status(402).json({ errorCode: 'PAYMENT_PENDING', message: 'Payment has not been confirmed. eSIM issuance requires a confirmed payment.' });
      return;
    case 'VERIFICATION_PENDING':
      res.status(403).json({ errorCode: 'VERIFICATION_PENDING', message: 'Identity verification has not been completed. eSIM issuance requires passed KYC/RICA verification.' });
      return;
    case 'ALREADY_ISSUED':
      res.status(200).json({
        orderId: result.orderId,
        activationState: result.activationState,
        activationCode: result.activationCode,
        smdpAddress: result.smdpAddress,
      });
      return;
    case 'ISSUED':
      res.status(200).json({
        orderId: result.orderId,
        activationState: result.activationState,
        activationCode: result.activationCode,
        smdpAddress: result.smdpAddress,
      });
      return;
  }
});

router.get('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const scenario = req.query.scenario as string | undefined;

  if (!scenario) {
    res.status(404).json({ errorCode: 'SCENARIO_REQUIRED', message: 'Query parameter ?scenario is required for stub responses.' });
    return;
  }

  const response = buildStatusResponse(id, scenario);
  if (!response) {
    res.status(404).json({ errorCode: 'SCENARIO_NOT_FOUND', message: `Unknown scenario: ${scenario}` });
    return;
  }

  res.status(200).json(response);
});

export default router;
