/*
 * Structured error response contract (LLD §10).
 *
 * Every 4xx/5xx API response must include all four fields below.
 *
 * ┌─────────────────────────┬──────────────┬───────────────────────────────────────────────────┐
 * │ reasonCode              │ retryable    │ statePreserved defaults                            │
 * ├─────────────────────────┼──────────────┼───────────────────────────────────────────────────┤
 * │ payment_failed          │ false        │ cart:true  order:true  payment:false               │
 * │   Payment was declined; order shell kept, payment attempt not completed.                    │
 * │ payment_pending         │ true         │ cart:true  order:true  payment:true                │
 * │   Awaiting async provider confirmation; client may poll.                                    │
 * │ kyc_failed              │ false        │ cart:true  order:false payment:false               │
 * │   Identity check rejected; case data kept for correction and resubmission.                 │
 * │ kyc_pending             │ true         │ cart:true  order:true  payment:true                │
 * │   Verification under review; client may poll.                                               │
 * │ eligibility_unavailable │ false        │ cart:true  order:false payment:false               │
 * │   Eligibility service unavailable or customer ineligible; operator action required.        │
 * │ activation_delayed      │ true         │ cart:true  order:true  payment:true                │
 * │   Payment and order saved; activation deferred (e.g. TZ/MZ market processing).            │
 * │ cart_expired            │ false        │ cart:false order:false payment:false               │
 * │   Cart TTL elapsed; client must start a new cart.                                          │
 * │ session_timeout         │ false        │ cart:false order:false payment:false               │
 * │   Authenticated session idle-timeout; client must re-authenticate.                         │
 * │ support_required        │ false        │ cart:true  order:true  payment:false               │
 * │   Terminal state; human intervention required before retry.                                │
 * │ not_found               │ false        │ cart:false order:false payment:false               │
 * │   Requested resource does not exist; no state to preserve on the server.                   │
 * │ validation_error        │ false        │ cart:true  order:false payment:false               │
 * │   Client-correctable field error; no human support needed, client should fix and resubmit. │
 * └─────────────────────────┴──────────────┴───────────────────────────────────────────────────┘
 */

export type ReasonCode =
  | 'payment_failed'
  | 'payment_pending'
  | 'kyc_failed'
  | 'kyc_pending'
  | 'eligibility_unavailable'
  | 'activation_delayed'
  | 'cart_expired'
  | 'session_timeout'
  | 'support_required'
  | 'not_found'
  | 'validation_error';

export interface StatePreserved {
  cart: boolean;
  order: boolean;
  payment: boolean;
}

export interface NextStep {
  action: string;
  url: string;
}

export interface StructuredError {
  reasonCode: ReasonCode;
  retryable: boolean;
  statePreserved: StatePreserved;
  nextSteps: NextStep[];
  message?: string;
  errorCode?: string;
}

// Defaults table — used when the caller doesn't need to override individual flags.
const DEFAULTS: Record<ReasonCode, { retryable: boolean; statePreserved: StatePreserved }> = {
  payment_failed:          { retryable: false, statePreserved: { cart: true,  order: true,  payment: false } },
  payment_pending:         { retryable: true,  statePreserved: { cart: true,  order: true,  payment: true  } },
  kyc_failed:              { retryable: false, statePreserved: { cart: true,  order: false, payment: false } },
  kyc_pending:             { retryable: true,  statePreserved: { cart: true,  order: true,  payment: true  } },
  eligibility_unavailable: { retryable: false, statePreserved: { cart: true,  order: false, payment: false } },
  activation_delayed:      { retryable: true,  statePreserved: { cart: true,  order: true,  payment: true  } },
  cart_expired:            { retryable: false, statePreserved: { cart: false, order: false, payment: false } },
  session_timeout:         { retryable: false, statePreserved: { cart: false, order: false, payment: false } },
  support_required:        { retryable: false, statePreserved: { cart: true,  order: true,  payment: false } },
  not_found:               { retryable: false, statePreserved: { cart: false, order: false, payment: false } },
  validation_error:        { retryable: false, statePreserved: { cart: true,  order: false, payment: false } },
};

const NEXT_STEPS: Record<ReasonCode, NextStep[]> = {
  payment_failed:          [{ action: 'retry_payment',       url: '/checkout/payments' }],
  payment_pending:         [{ action: 'poll_payment_status', url: '/api/orders/{orderId}/status-timeline' }],
  kyc_failed:              [{ action: 'resubmit_kyc',        url: '/sim-onboarding' }],
  kyc_pending:             [{ action: 'poll_kyc_status',     url: '/api/onboarding/verification/{orderId}' }],
  eligibility_unavailable: [{ action: 'contact_support',     url: '/support' }],
  activation_delayed:      [{ action: 'poll_activation',     url: '/api/orders/{orderId}/status-timeline' }],
  cart_expired:            [{ action: 'start_new_cart',      url: '/catalog' }],
  session_timeout:         [{ action: 'sign_in',             url: '/auth/login' }],
  support_required:        [{ action: 'contact_support',     url: '/support' }],
  not_found:               [{ action: 'check_reference',     url: '/support' }],
  validation_error:        [{ action: 'correct_and_resubmit', url: '/support' }],
};

export function buildStructuredError(
  reasonCode: ReasonCode,
  opts?: {
    message?: string;
    errorCode?: string;
    statePreserved?: Partial<StatePreserved>;
  },
): StructuredError {
  const defaults = DEFAULTS[reasonCode];
  const sp: StatePreserved = {
    ...defaults.statePreserved,
    ...(opts?.statePreserved ?? {}),
  };
  return {
    reasonCode,
    retryable: defaults.retryable,
    statePreserved: sp,
    nextSteps: NEXT_STEPS[reasonCode],
    ...(opts?.message !== undefined ? { message: opts.message } : {}),
    ...(opts?.errorCode !== undefined ? { errorCode: opts.errorCode } : {}),
  };
}
