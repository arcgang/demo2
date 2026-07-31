import { db } from '../../db/client';
import { MarketContext } from './MarketContext';

function rowToMarketContext(row: Record<string, unknown>): MarketContext {
  return {
    code: row['code'] as string,
    name: row['name'] as string,
    currencyCode: row['currency_code'] as string,
    currencySymbol: row['currency_symbol'] as string,
    taxLabel: row['tax_label'] as string,
    taxRate: parseFloat(row['tax_rate'] as string),
    languageCode: row['language_code'] as string,
    enabledPaymentMethods: row['enabled_payment_methods'] as string[],
  };
}

export const MarketContextService = {
  async list(): Promise<MarketContext[]> {
    const result = await db.query(
      `SELECT code, name, currency_code, currency_symbol, tax_label, tax_rate,
              language_code, enabled_payment_methods
       FROM markets
       WHERE active = true
       ORDER BY id ASC`,
    );
    return result.rows.map(rowToMarketContext);
  },

  async resolve(marketCode?: string): Promise<MarketContext | null> {
    if (marketCode !== undefined) {
      const result = await db.query(
        `SELECT code, name, currency_code, currency_symbol, tax_label, tax_rate,
                language_code, enabled_payment_methods
         FROM markets
         WHERE code = $1 AND active = true`,
        [marketCode],
      );
      if (result.rows.length === 0) return null;
      return rowToMarketContext(result.rows[0]);
    }

    // Default: first active market ordered by id.
    const result = await db.query(
      `SELECT code, name, currency_code, currency_symbol, tax_label, tax_rate,
              language_code, enabled_payment_methods
       FROM markets
       WHERE active = true
       ORDER BY id ASC
       LIMIT 1`,
    );
    if (result.rows.length === 0) return null;
    return rowToMarketContext(result.rows[0]);
  },
};
