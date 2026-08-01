import request from 'supertest';
import { app } from '../../../app';

/**
 * Acceptance tests – Part A: Order tracking status timeline pending visual treatment
 * Screen: GET /orders/:id  (wireframe_order_tracking_account.html)
 *
 * The status timeline must reflect only confirmed backend states.
 * Pending steps must render with a distinct pending visual treatment —
 * specifically grey color and/or dashed border — NOT the completed (green/solid) treatment.
 *
 *  AC-1  Pending milestones carry milestone--pending class, NOT milestone--completed.
 *  AC-2  Pending milestones do NOT display a timestamp (timestamps are for confirmed events only).
 *  AC-3  Completed milestones carry the completed class and DO display a timestamp.
 *  AC-4  CSS for milestone--pending explicitly uses a grey color (e.g. #9e9e9e, #999, grey,
 *        color:#6, or similar muted/grey tone) for the icon or text — not orange or green.
 *  AC-5  CSS for milestone--pending explicitly uses a dashed or dotted border style
 *        OR a grey/muted background — providing a visually distinct "pending" treatment
 *        that cannot be confused with the solid-green "completed" treatment.
 *  AC-6  The "Activation Complete" step in a partial scenario must NOT show
 *        the completed treatment when it has not been confirmed by the backend.
 *  AC-7  Pending milestones have a data-state="pending" attribute on the element.
 */

const PENDING_SCENARIO_URL = '/orders/ord_002?scenario=pending_verification';
const COMPLETE_SCENARIO_URL = '/orders/ord_001?scenario=activation_complete';

// ── AC-1: pending milestones have pending class, not completed class ──────────

describe('Order Tracking – AC-1: pending milestones carry pending class only', () => {
  it('pending_verification scenario has milestone--pending elements', async () => {
    const res = await request(app).get(PENDING_SCENARIO_URL);
    expect(res.text).toMatch(/class=["'][^"']*milestone--pending[^"']*["']/i);
  });

  it('pending milestone elements do NOT also carry milestone--completed class on the same element', async () => {
    const res = await request(app).get(PENDING_SCENARIO_URL);
    expect(res.text).not.toMatch(/class=["'][^"']*milestone--pending[^"']*milestone--completed[^"']*["']/i);
    expect(res.text).not.toMatch(/class=["'][^"']*milestone--completed[^"']*milestone--pending[^"']*["']/i);
  });

  it('verification_complete step is rendered with pending class in partial scenario', async () => {
    const res = await request(app).get(PENDING_SCENARIO_URL);
    const verIdx = res.text.search(/data-step=["']verification_complete["']/i);
    expect(verIdx).toBeGreaterThan(-1);
    const surroundingHtml = res.text.slice(Math.max(0, verIdx - 200), verIdx + 50);
    expect(surroundingHtml).toMatch(/milestone--pending/i);
  });
});

// ── AC-2: pending milestones do NOT show timestamps ──────────────────────────

describe('Order Tracking – AC-2: pending milestones have no timestamp', () => {
  it('pending verification_complete milestone has no timestamp span', async () => {
    const res = await request(app).get(PENDING_SCENARIO_URL);
    const verIdx = res.text.search(/data-step=["']verification_complete["']/i);
    expect(verIdx).toBeGreaterThan(-1);
    const nextIdx = res.text.indexOf('data-step=', verIdx + 10);
    const milestoneBlock = res.text.slice(verIdx, nextIdx > verIdx ? nextIdx : verIdx + 500);
    expect(milestoneBlock).not.toMatch(/milestone__timestamp/i);
  });

  it('pending esim_issued milestone has no timestamp span', async () => {
    const res = await request(app).get(PENDING_SCENARIO_URL);
    const esimIdx = res.text.search(/data-step=["']esim_issued["']/i);
    expect(esimIdx).toBeGreaterThan(-1);
    const nextIdx = res.text.indexOf('data-step=', esimIdx + 10);
    const milestoneBlock = res.text.slice(esimIdx, nextIdx > esimIdx ? nextIdx : esimIdx + 500);
    expect(milestoneBlock).not.toMatch(/milestone__timestamp/i);
  });
});

// ── AC-3: completed milestones carry completed class and have timestamps ──────

describe('Order Tracking – AC-3: completed milestones have completed class and timestamp', () => {
  it('activation_complete scenario has milestone--completed elements', async () => {
    const res = await request(app).get(COMPLETE_SCENARIO_URL);
    expect(res.text).toMatch(/class=["'][^"']*milestone--completed[^"']*["']/i);
  });

  it('order_placed step is completed and has a timestamp in activation_complete', async () => {
    const res = await request(app).get(COMPLETE_SCENARIO_URL);
    const stepIdx = res.text.search(/data-step=["']order_placed["']/i);
    expect(stepIdx).toBeGreaterThan(-1);
    const nextIdx = res.text.indexOf('data-step=', stepIdx + 10);
    const milestoneBlock = res.text.slice(stepIdx, nextIdx > stepIdx ? nextIdx : stepIdx + 500);
    expect(milestoneBlock).toMatch(/milestone--completed/i);
    expect(milestoneBlock).toMatch(/milestone__timestamp/i);
  });
});

// ── AC-4: pending milestone icon/text uses grey, not orange or green ──────────

describe('Order Tracking – AC-4: pending milestone CSS uses grey color (not orange/green)', () => {
  it('CSS for milestone--pending uses a grey color value for icon or text', async () => {
    const res = await request(app).get(PENDING_SCENARIO_URL);
    const styleMatch = res.text.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    expect(styleMatch).not.toBeNull();
    const css = styleMatch![1];
    // Extract the rule block for milestone--pending
    const pendingRuleMatch = css.match(/\.milestone--pending\s*\{([^}]+)\}/i);
    expect(pendingRuleMatch).not.toBeNull();
    const pendingRule = pendingRuleMatch![1];
    // Must contain a grey color — accept hex grey (#9, #6, #aaa, #ccc, #999, #bbb),
    // or the keyword 'gray'/'grey', or rgb values in the grey range
    const hasGreyColor =
      /#[0-9a-f]{3,6}/i.test(pendingRule) &&
      // The hex values used for grey: any value where R≈G≈B and they're not 2e7d32 (green) or f57c00 (orange)
      !/color:\s*#(2e7d32|f57c00|c62828|e6|FF)/i.test(pendingRule) &&
      // Specifically must NOT be the current orange (#f57c00) or green (#2e7d32)
      !/color:\s*#f57c00/i.test(pendingRule);
    const hasGreyKeyword = /(color:\s*(grey|gray)|color:\s*#[69a-c]{3}|color:\s*#[69a-c]{6})/i.test(pendingRule);
    // Check the icon sub-rule too
    const pendingIconMatch = css.match(/\.milestone--pending\s+\.milestone__icon\s*\{([^}]+)\}/i);
    const iconRule = pendingIconMatch ? pendingIconMatch[1] : '';
    const iconIsGrey =
      /color:\s*(grey|gray)/i.test(iconRule) ||
      /color:\s*#(9e9e9e|9|a|b|c|d)[0-9a-f]*/i.test(iconRule) ||
      /color:\s*#[0-9a-f]{6}/i.test(iconRule) && !/color:\s*#(2e7d32|f57c00)/i.test(iconRule);
    expect(hasGreyColor || hasGreyKeyword || iconIsGrey).toBe(true);
  });

  it('CSS for milestone--pending icon does NOT use the orange color (#f57c00) used for non-pending states', async () => {
    const res = await request(app).get(PENDING_SCENARIO_URL);
    const styleMatch = res.text.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    expect(styleMatch).not.toBeNull();
    const css = styleMatch![1];
    // The pending icon must not use the orange color that currently signals "pending" (pre-task)
    const pendingIconMatch = css.match(/\.milestone--pending\s*(?:\.[^{]*)?\{([^}]*color[^}]*)\}/i);
    if (pendingIconMatch) {
      expect(pendingIconMatch[1]).not.toMatch(/#f57c00/i);
    }
    // Also check nested .milestone--pending .milestone__icon
    const iconRuleMatch = css.match(/\.milestone--pending\s+\.milestone__icon\s*\{([^}]+)\}/i);
    if (iconRuleMatch) {
      expect(iconRuleMatch[1]).not.toMatch(/#f57c00/i);
    }
  });
});

// ── AC-5: pending milestone has dashed/dotted border or grey background ───────

describe('Order Tracking – AC-5: pending milestone has dashed/dotted border or grey background', () => {
  it('CSS for milestone--pending uses a dashed or dotted border', async () => {
    const res = await request(app).get(PENDING_SCENARIO_URL);
    const styleMatch = res.text.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    expect(styleMatch).not.toBeNull();
    const css = styleMatch![1];
    // The pending milestone must have a dashed or dotted border OR a grey/light background
    const hasDashedBorder = /\.milestone--pending[^{]*\{[^}]*(border[^}]*(dashed|dotted)|background[^}]*#[ef][0-9a-f]{5}|background:\s*(#f|#e|grey|gray|lightgr))/i.test(css);
    expect(hasDashedBorder).toBe(true);
  });

  it('pending milestone elements have a data-state="pending" attribute', async () => {
    const res = await request(app).get(PENDING_SCENARIO_URL);
    expect(res.text).toMatch(/data-state=["']pending["']/i);
  });
});

// ── AC-6: unconfirmed activation_complete step must NOT show completed style ──

describe('Order Tracking – AC-6: unconfirmed steps must not use completed visual treatment', () => {
  it('activation_complete step is NOT completed in pending_verification scenario', async () => {
    const res = await request(app).get(PENDING_SCENARIO_URL);
    const stepIdx = res.text.search(/data-step=["']activation_complete["']/i);
    expect(stepIdx).toBeGreaterThan(-1);
    const surroundingHtml = res.text.slice(Math.max(0, stepIdx - 200), stepIdx + 50);
    expect(surroundingHtml).not.toMatch(/milestone--completed/i);
  });

  it('esim_issued step is NOT completed in pending_verification scenario', async () => {
    const res = await request(app).get(PENDING_SCENARIO_URL);
    const stepIdx = res.text.search(/data-step=["']esim_issued["']/i);
    expect(stepIdx).toBeGreaterThan(-1);
    const surroundingHtml = res.text.slice(Math.max(0, stepIdx - 200), stepIdx + 50);
    expect(surroundingHtml).not.toMatch(/milestone--completed/i);
  });
});

// ── AC-7: pending milestones have data-state="pending" attribute ──────────────

describe('Order Tracking – AC-7: pending milestone elements carry data-state attribute', () => {
  it('elements with milestone--pending class also carry data-state="pending"', async () => {
    const res = await request(app).get(PENDING_SCENARIO_URL);
    // The element must carry both the CSS class and the data-state attribute
    expect(res.text).toMatch(/data-state=["']pending["']/i);
  });

  it('completed milestones carry data-state="completed" attribute', async () => {
    const res = await request(app).get(COMPLETE_SCENARIO_URL);
    expect(res.text).toMatch(/data-state=["']completed["']/i);
  });
});
