import {
  StatusEventType,
  TimelineEvent,
  appendTimelineEvent,
  seedTimelineEvents,
  getTimelineEvents,
} from './timelineStore';
import {
  updateOrderActivationState,
  updateOrderVerificationStatus,
} from '../order/orderStore';

export type { TimelineEvent };

export interface TimelineInput {
  orderId: string;
  paymentStatus: string | null;
  verificationStatus: string | null;
  activationStatus: string | null;
  timestamps: Partial<Record<StatusEventType, string>>;
}

const NEXT_POLL_MS_PENDING = 15_000;
const NEXT_POLL_MS_TERMINAL = 0;
const POLL_INTERVAL_MS = 15_000;

const EVENT_META: Record<StatusEventType, { label: string; description: string }> = {
  order_placed:            { label: 'Order Placed',            description: 'Your order has been received and is being processed.' },
  payment_confirmed:       { label: 'Payment Confirmed',        description: 'Your payment was successfully processed.' },
  payment_pending:         { label: 'Payment Pending',          description: 'We are waiting for payment confirmation.' },
  payment_failed:          { label: 'Payment Failed',           description: 'Your payment could not be processed. Please try again.' },
  verification_complete:   { label: 'Verification Complete',    description: 'Your identity verification has been completed.' },
  verification_pending:    { label: 'Verification Pending',     description: 'Your identity verification is under review.' },
  verification_failed:     { label: 'Verification Failed',      description: 'Identity verification could not be completed. Please resubmit your documents.' },
  fulfillment_in_progress: { label: 'Fulfillment In Progress',  description: 'Your order is being prepared for activation.' },
  esim_issued:             { label: 'eSIM Issued',              description: 'Your eSIM has been issued and is ready to install.' },
  activation_pending:      { label: 'Activation Pending',       description: 'Your SIM or eSIM activation is in progress.' },
  activation_complete:     { label: 'Activation Complete',      description: 'Your line is now active. Welcome to Vodacom.' },
  activation_failed:       { label: 'Activation Failed',        description: 'Activation could not be completed. Please contact support.' },
};

function makeEvent(
  eventType: StatusEventType,
  timestamp: string | null,
  isCurrent: boolean,
): TimelineEvent {
  const { label, description } = EVENT_META[eventType];
  return { eventType, label, description, timestamp: timestamp ?? null, isCurrent };
}

export function buildTimeline(input: TimelineInput): TimelineEvent[] {
  const { paymentStatus, verificationStatus, activationStatus, timestamps } = input;
  const events: TimelineEvent[] = [];

  // order_placed is always the first event
  events.push(makeEvent('order_placed', timestamps.order_placed ?? null, false));

  // Payment states
  if (paymentStatus === 'payment_failed') {
    events.push(makeEvent('payment_failed', timestamps.payment_failed ?? null, false));
    return markCurrent(events);
  }

  if (paymentStatus === 'payment_pending') {
    events.push(makeEvent('payment_pending', timestamps.payment_pending ?? null, false));
    return markCurrent(events);
  }

  if (paymentStatus === 'payment_confirmed') {
    events.push(makeEvent('payment_confirmed', timestamps.payment_confirmed ?? null, false));
  } else {
    // Unknown / no payment status: treat as pending
    events.push(makeEvent('payment_pending', null, false));
    return markCurrent(events);
  }

  // Verification states
  if (verificationStatus === 'verification_failed') {
    events.push(makeEvent('verification_failed', timestamps.verification_failed ?? null, false));
    return markCurrent(events);
  }

  if (verificationStatus === 'verification_pending' || verificationStatus == null) {
    events.push(makeEvent('verification_pending', timestamps.verification_pending ?? null, false));
    return markCurrent(events);
  }

  if (verificationStatus === 'verification_complete') {
    events.push(makeEvent('verification_complete', timestamps.verification_complete ?? null, false));
  }

  // Fulfillment / activation states
  if (activationStatus === 'activation_failed') {
    if (timestamps.fulfillment_in_progress || timestamps.esim_issued) {
      if (timestamps.fulfillment_in_progress) {
        events.push(makeEvent('fulfillment_in_progress', timestamps.fulfillment_in_progress, false));
      }
      if (timestamps.esim_issued) {
        events.push(makeEvent('esim_issued', timestamps.esim_issued, false));
      }
    }
    events.push(makeEvent('activation_failed', timestamps.activation_failed ?? null, false));
    return markCurrent(events);
  }

  if (activationStatus === 'activation_pending' || activationStatus == null) {
    if (timestamps.fulfillment_in_progress) {
      events.push(makeEvent('fulfillment_in_progress', timestamps.fulfillment_in_progress, false));
    }
    events.push(makeEvent('activation_pending', timestamps.activation_pending ?? null, false));
    return markCurrent(events);
  }

  if (activationStatus === 'activation_complete') {
    if (timestamps.fulfillment_in_progress) {
      events.push(makeEvent('fulfillment_in_progress', timestamps.fulfillment_in_progress, false));
    }
    if (timestamps.esim_issued) {
      events.push(makeEvent('esim_issued', timestamps.esim_issued, false));
    }
    events.push(makeEvent('activation_complete', timestamps.activation_complete ?? null, false));
    return markCurrent(events);
  }

  // esim_issued as activation status
  if (activationStatus === 'esim_issued') {
    if (timestamps.fulfillment_in_progress) {
      events.push(makeEvent('fulfillment_in_progress', timestamps.fulfillment_in_progress, false));
    }
    events.push(makeEvent('esim_issued', timestamps.esim_issued ?? null, false));
    return markCurrent(events);
  }

  // fulfillment_in_progress as activation status
  if (activationStatus === 'fulfillment_in_progress') {
    events.push(makeEvent('fulfillment_in_progress', timestamps.fulfillment_in_progress ?? null, false));
    return markCurrent(events);
  }

  // Fallback
  events.push(makeEvent('activation_pending', null, false));
  return markCurrent(events);
}

function markCurrent(events: TimelineEvent[]): TimelineEvent[] {
  if (events.length === 0) return events;
  const result = events.map((e) => ({ ...e, isCurrent: false }));
  result[result.length - 1].isCurrent = true;
  return result;
}

const TERMINAL_STATES: StatusEventType[] = ['activation_complete', 'activation_failed', 'payment_failed', 'verification_failed'];

export function computeNextPollMs(events: TimelineEvent[]): number {
  if (events.length === 0) return NEXT_POLL_MS_PENDING;
  const current = events[events.length - 1];
  if (TERMINAL_STATES.includes(current.eventType)) return NEXT_POLL_MS_TERMINAL;
  return NEXT_POLL_MS_PENDING;
}

function isTerminal(events: TimelineEvent[]): boolean {
  if (events.length === 0) return false;
  return TERMINAL_STATES.includes(events[events.length - 1].eventType);
}

export interface ActivationStatusUpdate {
  activationState: string;
  timestamp: string;
}

export function applyActivationStatusUpdate(
  orderId: string,
  update: ActivationStatusUpdate,
): void {
  const eventTypeMap: Record<string, StatusEventType> = {
    activation_failed:   'activation_failed',
    activation_complete: 'activation_complete',
    activation_pending:  'activation_pending',
    esim_issued:         'esim_issued',
    fulfillment_in_progress: 'fulfillment_in_progress',
  };

  const eventType = eventTypeMap[update.activationState];
  if (!eventType) return;

  // Keep the order record in sync so GET /status won't overwrite this push
  updateOrderActivationState(orderId, update.activationState);

  const { label, description } = EVENT_META[eventType];
  appendTimelineEvent(orderId, {
    eventType,
    label,
    description,
    timestamp: update.timestamp,
    isCurrent: true,
  });
}

export interface VerificationUpdate {
  verificationStatus: string;
  timestamp: string;
}

export function applyVerificationUpdate(
  orderId: string,
  update: VerificationUpdate,
): void {
  const eventTypeMap: Record<string, StatusEventType> = {
    verification_failed:   'verification_failed',
    verification_complete: 'verification_complete',
    verification_pending:  'verification_pending',
  };

  const eventType = eventTypeMap[update.verificationStatus];
  if (!eventType) return;

  // Keep the order record in sync so GET /status won't overwrite this push
  updateOrderVerificationStatus(orderId, update.verificationStatus);

  const { label, description } = EVENT_META[eventType];
  appendTimelineEvent(orderId, {
    eventType,
    label,
    description,
    timestamp: update.timestamp,
    isCurrent: true,
  });
}

// ── Background polling ────────────────────────────────────────────────────────

export interface OrderStateSnapshot {
  orderId: string;
  paymentStatus: string | null;
  verificationStatus: string | null;
  activationStatus: string | null;
  createdAt: string;
}

type OrderStateFetcher = () => OrderStateSnapshot[];

let _fetcher: OrderStateFetcher | null = null;
let _pollTimer: ReturnType<typeof setInterval> | null = null;

export function pollBoundaries(): void {
  if (!_fetcher) return;
  const snapshots = _fetcher();

  for (const snap of snapshots) {
    const current = getTimelineEvents(snap.orderId);
    if (isTerminal(current)) continue;

    // Map raw status values to state-machine tokens
    const activation = (() => {
      const s = snap.activationStatus?.toLowerCase();
      if (!s) return null;
      if (s === 'esim_issued') return 'esim_issued';
      if (s === 'activation_complete' || s === 'completed') return 'activation_complete';
      if (s === 'activation_failed' || s === 'failed') return 'activation_failed';
      if (s === 'fulfillment_in_progress') return 'fulfillment_in_progress';
      return 'activation_pending';
    })();

    const verification = (() => {
      const s = snap.verificationStatus?.toLowerCase();
      if (!s) return null;
      if (s === 'completed' || s === 'verified' || s === 'verification_complete') return 'verification_complete';
      if (s === 'failed' || s === 'verification_failed') return 'verification_failed';
      return 'verification_pending';
    })();

    const payment = (() => {
      const s = snap.paymentStatus?.toLowerCase();
      if (!s) return 'payment_pending';
      if (s === 'confirmed' || s === 'payment_confirmed') return 'payment_confirmed';
      if (s === 'failed' || s === 'payment_failed') return 'payment_failed';
      return 'payment_pending';
    })();

    // Rebuild timeline from live state using the real order-creation timestamp
    const updated = buildTimeline({
      orderId: snap.orderId,
      paymentStatus: payment,
      verificationStatus: verification,
      activationStatus: activation,
      timestamps: { order_placed: snap.createdAt },
    });

    seedTimelineEvents(snap.orderId, updated);
  }
}

export function startPolling(fetcher: OrderStateFetcher): void {
  _fetcher = fetcher;
  if (_pollTimer) return;
  _pollTimer = setInterval(pollBoundaries, POLL_INTERVAL_MS);
  if (typeof _pollTimer === 'object' && _pollTimer !== null && 'unref' in _pollTimer) {
    (_pollTimer as NodeJS.Timeout).unref();
  }
}

export function stopPolling(): void {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
  _fetcher = null;
}
