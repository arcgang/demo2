import { Router, Request, Response } from 'express';
import { getActivationStatus } from '../modules/activation/activationStatus';

const router = Router();

router.get('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;

  const response = getActivationStatus(id);
  if (!response) {
    res.status(404).json({ errorCode: 'ORDER_NOT_FOUND', message: `No activation record found for order: ${id}` });
    return;
  }

  res.status(200).json(response);
});

export default router;
