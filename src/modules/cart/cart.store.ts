import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

const CART_COOKIE = 'cart_sid';

interface CartItem {
  itemId: string;
  itemType: string;
}

interface CartSession {
  items: CartItem[];
}

const sessions = new Map<string, CartSession>();

function parseSid(req: Request): string | null {
  const cookieHeader = req.headers.cookie ?? '';
  const match = cookieHeader.match(new RegExp(`(?:^|; )${CART_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getOrCreateCart(req: Request, res: Response): CartSession {
  const sid = parseSid(req);
  if (sid && sessions.has(sid)) {
    return sessions.get(sid)!;
  }
  const newSid = randomUUID();
  const cart: CartSession = { items: [] };
  sessions.set(newSid, cart);
  res.cookie(CART_COOKIE, newSid, { httpOnly: true, sameSite: 'lax' });
  return cart;
}

export function lookupCart(req: Request): CartSession | null {
  const sid = parseSid(req);
  return sid ? (sessions.get(sid) ?? null) : null;
}

export function getCartCount(req: Request): number {
  const cart = lookupCart(req);
  return cart ? cart.items.length : 0;
}
