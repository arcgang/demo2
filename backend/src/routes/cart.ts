import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import {
  getCart,
  addItem,
  updateItem,
  deleteItem,
  AddItemInput,
} from '../modules/cart/cartService';

const router = Router();

const SESSION_COOKIE = 'cart_session';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    cookies[key] = decodeURIComponent(val);
  }
  return cookies;
}

function getSessionId(req: Request, res: Response): string {
  const cookies = parseCookies(req.headers.cookie);
  let sessionId = cookies[SESSION_COOKIE];
  if (!sessionId) {
    sessionId = randomUUID();
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${sessionId}; HttpOnly; SameSite=Lax; Path=/`);
  }
  return sessionId;
}

router.get('/', (req: Request, res: Response) => {
  const sessionId = getSessionId(req, res);
  res.status(200).json(getCart(sessionId));
});

router.post('/items', (req: Request, res: Response) => {
  const sessionId = getSessionId(req, res);
  const body = req.body as AddItemInput;

  if (
    !body.item_type ||
    !body.product_id ||
    !body.product_name ||
    body.qty == null ||
    typeof body.once_off_price_cents !== 'number' ||
    typeof body.recurring_price_cents !== 'number'
  ) {
    res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: 'Missing required fields.' });
    return;
  }

  try {
    const item = addItem(sessionId, body);
    res.status(201).json({ id: item.id, cart_id: item.cart_id, item_type: item.item_type });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'INVALID_ITEM_TYPE') {
      res.status(400).json({ errorCode: 'INVALID_ITEM_TYPE', message: 'Unknown item_type value.' });
    } else if (msg === 'INVALID_QTY') {
      res.status(400).json({ errorCode: 'INVALID_QTY', message: 'qty must be a positive integer.' });
    } else {
      res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: 'Unexpected error.' });
    }
  }
});

router.put('/items/:id', (req: Request, res: Response) => {
  const sessionId = getSessionId(req, res);
  const { id } = req.params;
  const patch = req.body as { qty?: number; variant_label?: string | null };

  try {
    const item = updateItem(sessionId, id, patch);
    if (!item) {
      res.status(404).json({ errorCode: 'ITEM_NOT_FOUND', message: 'Item not found in cart.' });
      return;
    }
    res.status(200).json(item);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'INVALID_QTY') {
      res.status(400).json({ errorCode: 'INVALID_QTY', message: 'qty must be a positive integer.' });
    } else {
      res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: 'Unexpected error.' });
    }
  }
});

router.delete('/items/:id', (req: Request, res: Response) => {
  const sessionId = getSessionId(req, res);
  const { id } = req.params;
  const force = req.query.force === 'true';

  const result = deleteItem(sessionId, id, force);
  if (!result.ok) {
    if (result.errorCode === 'ITEM_NOT_FOUND') {
      res.status(404).json({ errorCode: result.errorCode, message: result.message });
    } else {
      res.status(409).json({ errorCode: result.errorCode, message: result.message });
    }
    return;
  }

  res.status(204).send();
});

export default router;
