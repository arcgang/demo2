import { Market } from '../modules/market/market.model';
import { isPaymentMethodEnabled } from './market-context';

/**
 * Renders the payment method selection section.
 * Only renders methods listed in market.enabledPaymentMethods.
 * If 'mobile_money' is absent, the M-Pesa/wallet option is not rendered at all.
 */
export function renderPaymentMethods(market: Market): string {
  const hasCard = isPaymentMethodEnabled('card', market);
  const hasMobileMoney = isPaymentMethodEnabled('mobile_money', market);

  const cardOption = hasCard
    ? `<label class="payment-method-option">
    <input type="radio" name="payment-method" value="card" required />
    <span class="payment-method-label">Credit or Debit Card</span>
    <span class="payment-method-desc">Secure payment with tokenized card processing</span>
    <span class="card-icons" aria-label="Accepted cards: VISA, Mastercard, Amex">VISA MC AMEX</span>
  </label>
  <div class="card-details" id="card-details">
    <label for="card-number">Card Number</label>
    <input type="text" id="card-number" name="card-number" required maxlength="19" placeholder="1234 5678 9012 3456" autocomplete="cc-number" />
    <label for="expiry">Expiry Date</label>
    <input type="text" id="expiry" name="expiry" required maxlength="5" placeholder="MM/YY" autocomplete="cc-exp" />
    <label for="cvv">CVV</label>
    <input type="text" id="cvv" name="cvv" required maxlength="4" placeholder="123" autocomplete="cc-csc" />
    <label for="cardholder-name">Cardholder Name</label>
    <input type="text" id="cardholder-name" name="cardholder-name" required placeholder="Name as it appears on card" autocomplete="cc-name" />
  </div>`
    : '';

  const mobileMoneyOption = hasMobileMoney
    ? `<label class="payment-method-option">
    <input type="radio" name="payment-method" value="mobile-money" />
    <span class="payment-method-label">Mobile Money</span>
    <span class="payment-method-desc">Pay with M-Pesa or Vodacom wallet</span>
  </label>`
    : '';

  return `<section class="payment-methods" aria-labelledby="payment-heading">
  <h2 id="payment-heading">2 Payment Method</h2>
  <fieldset>
    <legend class="sr-only">Select a payment method</legend>
    ${cardOption}
    ${mobileMoneyOption}
  </fieldset>
</section>`;
}
