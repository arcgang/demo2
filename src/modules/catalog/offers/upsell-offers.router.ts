import { Router, Request, Response } from 'express';
import { getUpsellOffersByContext } from './upsell-offers.service';

export const upsellOffersRouter = Router();

upsellOffersRouter.get('/upsell', (req: Request, res: Response) => {
  const context = req.query['context'];

  if (typeof context !== 'string' || context.trim() === '') {
    res.status(400).json({
      errorCode: 'MISSING_CONTEXT_PARAMETER',
      message: 'Query parameter "context" is required.',
      category: 'Validation',
    });
    return;
  }

  const offers = getUpsellOffersByContext(context.trim());
  res.status(200).json({ offers });
});
