import { Request } from 'express';
import { prisma } from '../../lib/prisma';

export interface MarketContext {
  code: string;
  name: string;
  currency: string;
  taxRate: number;
  taxLabel: string;
  defaultLanguage: string;
}

export class MarketContextService {
  async listMarkets(): Promise<MarketContext[]> {
    const markets = await prisma.market.findMany();
    return markets.map(this.toContext);
  }

  async resolve(req: Request): Promise<MarketContext | null> {
    const code =
      (req.query['market'] as string | undefined) ??
      (req.headers['x-market-code'] as string | undefined);
    if (!code) return null;
    return this.getByCode(code);
  }

  async getByCode(code: string): Promise<MarketContext | null> {
    const market = await prisma.market.findUnique({
      where: { code: code.toUpperCase() },
    });
    return market ? this.toContext(market) : null;
  }

  private toContext(m: {
    code: string;
    name: string;
    currency: string;
    taxRate: number;
    taxLabel: string;
    defaultLanguage: string;
  }): MarketContext {
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
