import { Request } from 'express';
import { MARKETS, MarketSeed } from '../../data/seed';

export interface MarketContext {
  code: string;
  name: string;
  currency: string;
  taxRate: number;
  taxLabel: string;
  defaultLanguage: string;
}

export class MarketContextService {
  private readonly markets: Map<string, MarketSeed>;

  constructor() {
    this.markets = new Map(MARKETS.map((m) => [m.code, m]));
  }

  listMarkets(): MarketContext[] {
    return MARKETS.map(this.toContext);
  }

  resolve(req: Request): MarketContext | null {
    const code =
      (req.query['market'] as string | undefined) ??
      (req.headers['x-market-code'] as string | undefined);
    if (!code) return null;
    return this.getByCode(code);
  }

  getByCode(code: string): MarketContext | null {
    const market = this.markets.get(code.toUpperCase());
    return market ? this.toContext(market) : null;
  }

  private toContext(m: MarketSeed): MarketContext {
    return {
      code: m.code,
      name: m.name,
      currency: m.currency,
      taxRate: m.taxRate,
      taxLabel: m.taxLabel,
      defaultLanguage: m.defaultLanguage,
    };
  }
}
