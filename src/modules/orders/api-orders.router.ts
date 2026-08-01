import { Router, Request, Response } from 'express';
import { generateOrderReference, storeOrder } from './order-store';

export const apiOrdersRouter = Router();

apiOrdersRouter.post('/', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  const missing: string[] = [];
  for (const field of ['cartId', 'paymentAttemptId', 'paymentStatus', 'lineItems'] as const) {
    if (body[field] === undefined || body[field] === null) missing.push(field);
  }
  if (missing.length === 0) {
    const items = body.lineItems;
    if (!Array.isArray(items) || items.length === 0) {
      missing.push('lineItems');
    }
  }
  if (missing.length > 0) {
    res.status(422).json({
      errorCode: 'VALIDATION_ERROR',
      message: 'Required fields are missing or invalid.',
      errors: missing.map(f => ({ field: f, message: `${f} is required` })),
    });
    return;
  }

  const orderReference = generateOrderReference();
  const confirmation = {
    orderReference,
    orderDate: new Date().toISOString(),
    lineItems: body.lineItems as Array<{ name: string; qty: number; unitPrice: number }>,
    onceOffTotal: body.onceOffTotal as number,
    monthlyTotal: body.monthlyTotal as number,
    paymentStatus: body.paymentStatus as string,
    nextSteps: [
      { step: 'eSIM issuance', status: 'pending', estimatedMinutes: 5 },
      { step: 'activation', status: 'pending', estimatedMinutes: 10 },
    ],
  };

  storeOrder(confirmation);

  res.status(201).json(confirmation);
});
