import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { TradeInCondition } from './tradeInAdapter';

export interface TradeInQuoteRecord {
  id: string;
  brand: string;
  model: string;
  storage: number;
  condition: TradeInCondition;
  estimatedCredit: number;
  validUntil: string;
  cartId: string | null;
}

// File-backed store representing the trade_in_quotes table.
// Exported so tests can inject a temp path to avoid shared-state pollution.
export let DB_PATH = path.join(__dirname, '..', '..', '..', 'data', 'trade_in_quotes.json');

export function setDbPath(p: string): void {
  DB_PATH = p;
}

function ensureDir(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readAll(): Record<string, TradeInQuoteRecord> {
  ensureDir();
  if (!fs.existsSync(DB_PATH)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as Record<string, TradeInQuoteRecord>;
  } catch {
    return {};
  }
}

function writeAll(records: Record<string, TradeInQuoteRecord>): void {
  ensureDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(records, null, 2), 'utf-8');
}

// All mutations are serialised through a single promise chain so that
// concurrent requests cannot interleave a read and a write (TOCTOU).
let writeLock: Promise<unknown> = Promise.resolve();

function withWriteLock<T>(fn: () => T): Promise<T> {
  const next = writeLock.then(fn);
  // Swallow rejections on the shared chain so one failure does not block
  // every subsequent enqueued operation.
  writeLock = next.catch(() => undefined);
  return next;
}

export function saveQuote(record: Omit<TradeInQuoteRecord, 'id'>): Promise<TradeInQuoteRecord> {
  return withWriteLock(() => {
    const records = readAll();
    // UUID eliminates ID collisions without needing a counter read-modify-write.
    const id = `tiq_${randomUUID()}`;
    const full: TradeInQuoteRecord = { id, ...record };
    records[id] = full;
    writeAll(records);
    return full;
  });
}

export function findQuote(id: string): TradeInQuoteRecord | undefined {
  return readAll()[id];
}

/**
 * Atomically checks that the quote is not yet attached to a cart, then
 * attaches it.  Returns false if the quote does not exist or is already
 * attached — prevents double-spend under concurrent requests (TOCTOU fix).
 */
export function attachCartToQuote(id: string, cartId: string): Promise<boolean> {
  return withWriteLock(() => {
    const records = readAll();
    if (!records[id] || records[id].cartId !== null) return false;
    records[id].cartId = cartId;
    writeAll(records);
    return true;
  });
}
