"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketContextService = void 0;
const client_1 = require("../../db/client");
function rowToMarketContext(row) {
    return {
        code: row['code'],
        name: row['name'],
        currencyCode: row['currency_code'],
        currencySymbol: row['currency_symbol'],
        taxLabel: row['tax_label'],
        taxRate: parseFloat(row['tax_rate']),
        languageCode: row['language_code'],
        enabledPaymentMethods: row['enabled_payment_methods'],
    };
}
exports.MarketContextService = {
    async list() {
        const result = await client_1.db.query(`SELECT code, name, currency_code, currency_symbol, tax_label, tax_rate,
              language_code, enabled_payment_methods
       FROM markets
       WHERE active = true
       ORDER BY id ASC`);
        return result.rows.map(rowToMarketContext);
    },
    async resolve(marketCode) {
        if (marketCode !== undefined) {
            const result = await client_1.db.query(`SELECT code, name, currency_code, currency_symbol, tax_label, tax_rate,
                language_code, enabled_payment_methods
         FROM markets
         WHERE code = $1 AND active = true`, [marketCode]);
            if (result.rows.length === 0)
                return null;
            return rowToMarketContext(result.rows[0]);
        }
        // Default: first active market ordered by id.
        const result = await client_1.db.query(`SELECT code, name, currency_code, currency_symbol, tax_label, tax_rate,
              language_code, enabled_payment_methods
       FROM markets
       WHERE active = true
       ORDER BY id ASC
       LIMIT 1`);
        if (result.rows.length === 0)
            return null;
        return rowToMarketContext(result.rows[0]);
    },
};
