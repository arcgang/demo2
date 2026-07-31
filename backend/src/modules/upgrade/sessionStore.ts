import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Request, Response } from 'express';

export interface UpgradeSessionState {
  eligibility: Record<string, unknown> | null;
  financing: Record<string, unknown> | null;
  tradeIn: Record<string, unknown> | null;
}

const SESSION_COOKIE = 'upgrade_sid';
const DB_PATH = path.join(__dirname, '..', '..', '..', 'data', 'upgrade_sessions.json');

function ensureDbDir(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadStore(): Record<string, UpgradeSessionState> {
  ensureDbDir();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw) as Record<string, UpgradeSessionState>;
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, UpgradeSessionState>): void {
  ensureDbDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function emptyState(): UpgradeSessionState {
  return { eligibility: null, financing: null, tradeIn: null };
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx < 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key) result[key] = val;
  }
  return result;
}

export function resolveSession(req: Request, res: Response): string {
  const cookies = parseCookies(req.headers.cookie);
  const existing = cookies[SESSION_COOKIE];
  const store = loadStore();
  if (existing && Object.prototype.hasOwnProperty.call(store, existing)) {
    return existing;
  }
  const sessionId = randomUUID();
  store[sessionId] = emptyState();
  saveStore(store);
  res.cookie(SESSION_COOKIE, sessionId, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  return sessionId;
}

export function getState(sessionId: string): UpgradeSessionState {
  const store = loadStore();
  return store[sessionId] ?? emptyState();
}

export function patchState(sessionId: string, patch: Partial<UpgradeSessionState>): UpgradeSessionState {
  const store = loadStore();
  const current = store[sessionId] ?? emptyState();
  const updated: UpgradeSessionState = { ...current };
  if ('eligibility' in patch) updated.eligibility = patch.eligibility ?? null;
  if ('financing' in patch) updated.financing = patch.financing ?? null;
  if ('tradeIn' in patch) updated.tradeIn = patch.tradeIn ?? null;
  store[sessionId] = updated;
  saveStore(store);
  return updated;
}
