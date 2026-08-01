import { Market } from '../modules/market/market.model';

/**
 * Renders the market selector button shown in the page header.
 * Displays the flag emoji, market label, and currency code.
 */
export function renderMarketSelectorButton(market: Market): string {
  return `<button
    type="button"
    id="market-selector-btn"
    class="market-selector-btn"
    aria-haspopup="listbox"
    aria-expanded="false"
    aria-label="Select market: ${market.displayLabel}"
  >${market.flagEmoji} ${market.displayLabel}</button>`;
}

/**
 * Renders the dropdown listbox listing all active markets.
 * WCAG 2.1 AA: role=listbox, role=option, keyboard accessible, visible focus.
 */
export function renderMarketDropdown(markets: Market[], currentCode: string): string {
  const options = markets
    .filter((m) => m.active)
    .map(
      (m) => `<li
      role="option"
      id="market-option-${m.code}"
      aria-selected="${m.code === currentCode}"
      data-market-code="${m.code}"
      tabindex="${m.code === currentCode ? '0' : '-1'}"
      class="market-option${m.code === currentCode ? ' market-option--selected' : ''}"
    >${m.flagEmoji} ${m.displayLabel}</li>`,
    )
    .join('\n');

  return `<ul
    role="listbox"
    id="market-dropdown"
    class="market-dropdown"
    aria-labelledby="market-selector-btn"
    aria-label="Available markets"
  >
${options}
  </ul>`;
}

/**
 * Renders the full market selector widget (button + hidden dropdown).
 * JavaScript in the page handles open/close, keyboard nav, and form submission.
 */
export function renderMarketSelector(markets: Market[], currentMarket: Market): string {
  return `<div class="market-selector" data-current-market="${currentMarket.code}">
  ${renderMarketSelectorButton(currentMarket)}
  <div class="market-dropdown-container" hidden aria-hidden="true">
    ${renderMarketDropdown(markets, currentMarket.code)}
  </div>
  <form id="market-switch-form" method="POST" action="/market/select" style="display:none">
    <input type="hidden" name="marketCode" id="market-switch-input" value="${currentMarket.code}" />
  </form>
</div>`;
}
