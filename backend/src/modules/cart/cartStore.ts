import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface CartItem {
  lineId: string;
  lineType: string;
  name: string;
  onceOffAmount: number;
  recurringAmount: number;
}

export interface CartRecord {
  cartId: string;
  marketCode: string;
  items: CartItem[];
}

export let CART_DB_PATH = path.join(__dirname, '..', '..', '..', 'data', 'carts.json');

export function setCartDbPath(p: string): void {
  CART_DB_PATH = p;
}

function ensureDir(): void {
  const dir = path.dirname(CART_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readAll(): Record<string, CartRecord> {
  ensureDir();
  if (!fs.existsSync(CART_DB_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CART_DB_PATH, 'utf-8')) as Record<string, CartRecord>;
  } catch {
    return {};
  }
}

function writeAll(records: Record<string, CartRecord>): void {
  ensureDir();
  fs.writeFileSync(CART_DB_PATH, JSON.stringify(records, null, 2), 'utf-8');
}

let writeLock: Promise<unknown> = Promise.resolve();

function withWriteLock<T>(fn: () => T): Promise<T> {
  const next = writeLock.then(fn);
  writeLock = next.catch(() => undefined);
  return next;
}

export function createCart(marketCode: string): Promise<CartRecord> {
  return withWriteLock(() => {
    const records = readAll();
    const cartId = `cart_${randomUUID()}`;
    const cart: CartRecord = { cartId, marketCode, items: [] };
    records[cartId] = cart;
    writeAll(records);
    return cart;
  });
}

export function findCart(cartId: string): CartRecord | undefined {
  return readAll()[cartId];
}

export function addCartItem(cartId: string, item: Omit<CartItem, 'lineId'>): Promise<CartItem | null> {
  return withWriteLock(() => {
    const records = readAll();
    if (!records[cartId]) return null;
    const lineId = `line_${randomUUID()}`;
    const line: CartItem = { lineId, ...item };
    records[cartId].items.push(line);
    writeAll(records);
    return line;
  });
}

export function getOnceOffSubtotal(cartId: string): number | null {
  const cart = findCart(cartId);
  if (!cart) return null;
  return cart.items.reduce((sum, item) => sum + item.onceOffAmount, 0);
}
