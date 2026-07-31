import * as fs from 'fs';
import * as path from 'path';
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
const DB_PATH = path.join(__dirname, '..', '..', '..', 'data', 'trade_in_quotes.json');

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

function nextId(records: Record<string, TradeInQuoteRecord>): string {
  const ids = Object.keys(records)
    .map(k => parseInt(k.replace('tiq_', ''), 10))
    .filter(n => !isNaN(n));
  const max = ids.length > 0 ? Math.max(...ids) : 0;
  return `tiq_${max + 1}`;
}

export function saveQuote(record: Omit<TradeInQuoteRecord, 'id'>): TradeInQuoteRecord {
  const records = readAll();
  const id = nextId(records);
  const full: TradeInQuoteRecord = { id, ...record };
  records[id] = full;
  writeAll(records);
  return full;
}

export function findQuote(id: string): TradeInQuoteRecord | undefined {
  return readAll()[id];
}

export function attachCartToQuote(id: string, cartId: string): void {
  const records = readAll();
  if (records[id]) {
    records[id].cartId = cartId;
    writeAll(records);
  }
}
