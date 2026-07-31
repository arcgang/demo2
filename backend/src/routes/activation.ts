import { Router, Request, Response } from 'express';
import { getActivationStatus } from '../modules/activation/activationStatus';

const router = Router();

router.get('/:orderId', (req: Request, res: Response) => {
  const { orderId } = req.params;
  const result = getActivationStatus(orderId);

  if (!result) {
    res.status(404).json({
      errorCode: 'ORDER_NOT_FOUND',
      message: `No activation record found for order: ${orderId}`,
    });
    return;
  }

  res.status(200).json(result);
});

export default router;
