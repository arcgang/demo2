import { db } from './client';

export async function runMigrations(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS markets (
      id SERIAL PRIMARY KEY,
      code VARCHAR(8) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      currency_code VARCHAR(8) NOT NULL,
      currency_symbol VARCHAR(8) NOT NULL,
      tax_label VARCHAR(32) NOT NULL,
      tax_rate NUMERIC(6,4) NOT NULL,
      language_code VARCHAR(16) NOT NULL,
      enabled_payment_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Seed the South Africa market if not present.
  await db.query(`
    INSERT INTO markets
      (code, name, currency_code, currency_symbol, tax_label, tax_rate, language_code, enabled_payment_methods, active)
    VALUES
      ('ZA', 'South Africa', 'ZAR', 'R', 'VAT', 0.15, 'en-ZA', '["card","mobile_money"]'::jsonb, true)
    ON CONFLICT (code) DO NOTHING
  `);
}
