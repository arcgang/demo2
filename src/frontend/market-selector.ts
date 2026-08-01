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
 * Renders the full market selector widget (button + hidden dropdown) with an
 * inline script that drives WCAG 2.1 AA keyboard accessibility:
 *   - toggles aria-expanded and shows/hides the container on click / Enter / Space
 *   - ArrowDown/ArrowUp move focus within the listbox
 *   - Enter/Space on an option submits the market-switch form
 *   - Escape closes the dropdown and returns focus to the button
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
  <script>
  (function () {
    var btn = document.getElementById('market-selector-btn');
    var container = btn && btn.nextElementSibling;
    var form = document.getElementById('market-switch-form');
    var input = document.getElementById('market-switch-input');
    if (!btn || !container || !form || !input) return;

    function open() {
      container.removeAttribute('hidden');
      container.removeAttribute('aria-hidden');
      btn.setAttribute('aria-expanded', 'true');
      var first = container.querySelector('[role="option"][tabindex="0"], [role="option"]');
      if (first) first.focus();
    }

    function close() {
      container.setAttribute('hidden', '');
      container.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }

    function selectOption(opt) {
      input.value = opt.getAttribute('data-market-code');
      form.submit();
    }

    btn.addEventListener('click', function () {
      btn.getAttribute('aria-expanded') === 'true' ? close() : open();
    });

    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        open();
      }
    });

    container.addEventListener('keydown', function (e) {
      var opts = Array.prototype.slice.call(container.querySelectorAll('[role="option"]'));
      var idx = opts.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (idx < opts.length - 1) opts[idx + 1].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx > 0) opts[idx - 1].focus(); else close();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (idx >= 0) selectOption(opts[idx]);
      } else if (e.key === 'Escape') {
        close();
      }
    });

    container.addEventListener('click', function (e) {
      var opt = e.target.closest('[role="option"]');
      if (opt) selectOption(opt);
    });

    document.addEventListener('click', function (e) {
      if (!btn.closest('.market-selector').contains(e.target)) close();
    });
  })();
  </script>
</div>`;
}
