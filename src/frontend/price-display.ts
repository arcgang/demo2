import { Market } from '../modules/market/market.model';
import { formatPrice, computeTax } from './market-context';

export interface OrderLine {
  label: string;
  amount: number;
}

export interface CartSummaryData {
  onceOffLines: OrderLine[];
  recurringLines: OrderLine[];
  tradeInCredit?: number;
}

/**
 * Renders a single price value using the market's currency symbol and code.
 * No 'R' is ever hardcoded — symbol always comes from market.currencySymbol.
 */
export function renderPrice(amount: number, market: Market): string {
  return `<span class="price" data-currency="${market.currencyCode}">${formatPrice(amount, market)}</span>`;
}

/**
 * Renders the cart/checkout order summary with market-aware currency, tax label/rate,
 * and optional trade-in credit line. Tax is computed from market.taxRate — not hardcoded.
 */
export function renderOrderSummary(data: CartSummaryData, market: Market): string {
  const onceOffSubtotal = data.onceOffLines.reduce((sum, l) => sum + l.amount, 0);
  const recurringSubtotal = data.recurringLines.reduce((sum, l) => sum + l.amount, 0);
  const tax = computeTax(onceOffSubtotal, market);
  const credit = data.tradeInCredit ?? 0;
  const total = onceOffSubtotal + tax.amount - credit;

  const onceOffRows = data.onceOffLines
    .map((l) => `<tr><td>${l.label}</td><td>${formatPrice(l.amount, market)}</td></tr>`)
    .join('\n');

  const recurringRows = data.recurringLines
    .map((l) => `<tr><td>${l.label}</td><td>${formatPrice(l.amount, market)}/month</td></tr>`)
    .join('\n');

  const tradeInRow = credit > 0
    ? `<tr><td>Trade-In Credit</td><td>- ${formatPrice(credit, market)}</td></tr>`
    : '';

  return `<section class="order-summary" data-currency="${market.currencyCode}" aria-label="Order Summary">
  <h2>Order Summary</h2>
  <table>
    <caption class="sr-only">Once-off charges</caption>
    <tbody>
      ${onceOffRows}
      <tr><th scope="row">Subtotal</th><td>${formatPrice(onceOffSubtotal, market)}</td></tr>
    </tbody>
  </table>
  <table>
    <caption class="sr-only">Recurring charges</caption>
    <tbody>
      ${recurringRows}
      <tr><th scope="row">Monthly Subtotal</th><td>${formatPrice(recurringSubtotal, market)}/month</td></tr>
    </tbody>
  </table>
  <table class="totals">
    <tbody>
      <tr><td>${tax.label}</td><td>${formatPrice(tax.amount, market)}</td></tr>
      ${tradeInRow}
      <tr class="total-row"><th scope="row">Total Once-Off</th><td>${formatPrice(total, market)}</td></tr>
      <tr><td colspan="2">+ ${formatPrice(recurringSubtotal, market)}/month</td></tr>
    </tbody>
  </table>
</section>`;
}
