import { Market } from '../modules/market/market.model';
import { formatPrice } from './market-context';

export interface CartItemData {
  productId: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  eligible: boolean;
  warning?: string;
}

/**
 * Renders a cart item row, including a visible ineligibility warning when the
 * item is not available in the selected market.
 * An ineligible item renders a warning banner and disables the checkout flow.
 */
export function renderCartItem(item: CartItemData, market: Market): string {
  const msg = item.warning ?? 'This item is not available in your market.';
  const warningHtml = !item.eligible
    ? `<div class="cart-item-warning" role="alert" aria-live="polite">
      <span class="warning-icon" aria-hidden="true">⚠</span>
      ${msg}
    </div>`
    : '';

  return `<article class="cart-item${!item.eligible ? ' cart-item--ineligible' : ''}" data-product-id="${item.productId}">
  <h3 class="cart-item-name">${item.name}</h3>
  ${item.description ? `<p class="cart-item-desc">${item.description}</p>` : ''}
  <div class="cart-item-price">${formatPrice(item.price, market)}</div>
  <div class="cart-item-qty" aria-label="Quantity: ${item.quantity}">${item.quantity}</div>
  ${warningHtml}
</article>`;
}

/**
 * Renders the checkout button with appropriate disabled state when any cart
 * item is ineligible for the selected market.
 */
export function renderCheckoutButton(items: CartItemData[]): string {
  const canProceed = items.every((i) => i.eligible);
  const disabledAttr = canProceed ? '' : ' disabled aria-disabled="true"';
  const title = canProceed
    ? ''
    : ' title="Remove or replace market-ineligible items before proceeding"';

  return `<button
    type="button"
    class="btn-checkout"
    ${disabledAttr}${title}
  >Proceed to Checkout</button>`;
}

/**
 * Renders all cart items, plus an ineligibility summary banner when any item
 * is not available in the selected market.
 */
export function renderCart(items: CartItemData[], market: Market): string {
  const hasIneligible = items.some((i) => !i.eligible);
  const ineligibleBanner = hasIneligible
    ? `<div class="cart-ineligibility-banner" role="alert" aria-live="assertive">
    <strong>Some items in your cart are not available in ${market.displayLabel}.</strong>
    Remove or replace them before proceeding to checkout.
  </div>`
    : '';

  const itemsHtml = items.map((item) => renderCartItem(item, market)).join('\n');

  return `<section class="cart-items">
${ineligibleBanner}
${itemsHtml}
${renderCheckoutButton(items)}
</section>`;
}
