import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

export interface UpgradeSessionState {
  eligibility: Record<string, unknown> | null;
  financing: Record<string, unknown> | null;
  tradeIn: Record<string, unknown> | null;
}

const SESSION_COOKIE = 'upgrade_sid';
const store = new Map<string, UpgradeSessionState>();

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
  if (existing && store.has(existing)) {
    return existing;
  }
  const sessionId = randomUUID();
  store.set(sessionId, emptyState());
  res.cookie(SESSION_COOKIE, sessionId, { httpOnly: true, sameSite: 'lax' });
  return sessionId;
}

export function getState(sessionId: string): UpgradeSessionState {
  return store.get(sessionId) ?? emptyState();
}

export function patchState(sessionId: string, patch: Partial<UpgradeSessionState>): UpgradeSessionState {
  const current = store.get(sessionId) ?? emptyState();
  const updated: UpgradeSessionState = { ...current };
  if ('eligibility' in patch) updated.eligibility = patch.eligibility ?? null;
  if ('financing' in patch) updated.financing = patch.financing ?? null;
  if ('tradeIn' in patch) updated.tradeIn = patch.tradeIn ?? null;
  store.set(sessionId, updated);
  return updated;
}
