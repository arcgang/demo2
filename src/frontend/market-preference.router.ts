import { Router, Request, Response } from 'express';
import { listMarkets, getMarketByCode } from '../modules/market/market.service';

export const marketPreferenceRouter = Router();

const MARKET_COOKIE = 'selectedMarketCode';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000;

marketPreferenceRouter.get('/current', (req: Request, res: Response) => {
  const cookieCode = typeof req.cookies?.[MARKET_COOKIE] === 'string'
    ? req.cookies[MARKET_COOKIE]
    : null;

  const market = cookieCode
    ? getMarketByCode(cookieCode)
    : listMarkets().find((m) => m.active);

  if (!market) {
    res.status(404).json({ error: 'No active market found' });
    return;
  }

  res.status(200).json(market);
});

marketPreferenceRouter.post('/select', (req: Request, res: Response) => {
  const { marketCode } = req.body as { marketCode?: string };

  if (!marketCode) {
    res.status(400).json({ error: 'marketCode is required' });
    return;
  }

  const market = getMarketByCode(marketCode);
  if (!market || !market.active) {
    res.status(400).json({ error: `Unknown or inactive market code: ${marketCode}` });
    return;
  }

  res.cookie(MARKET_COOKIE, marketCode, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: false,
    sameSite: 'lax',
  });

  const redirect = typeof req.body['redirect'] === 'string' ? req.body['redirect'] : '/';
  res.redirect(302, redirect);
});
