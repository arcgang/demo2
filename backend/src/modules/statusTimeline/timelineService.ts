import {
  StatusEventType,
  TimelineEvent,
  appendTimelineEvent,
} from './timelineStore';

export type { TimelineEvent };

export interface TimelineInput {
  orderId: string;
  paymentStatus: string | null;
  verificationStatus: string | null;
  activationStatus: string | null;
  timestamps: Partial<Record<StatusEventType, string>>;
}

const NEXT_POLL_MS_PENDING = 15_000;
const NEXT_POLL_MS_TERMINAL = 60_000;

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

export function computeNextPollMs(events: TimelineEvent[]): number {
  if (events.length === 0) return NEXT_POLL_MS_PENDING;
  const current = events[events.length - 1];
  const terminal: StatusEventType[] = ['activation_complete', 'activation_failed', 'payment_failed', 'verification_failed'];
  if (terminal.includes(current.eventType)) return NEXT_POLL_MS_TERMINAL;
  return NEXT_POLL_MS_PENDING;
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

  const { label, description } = EVENT_META[eventType];
  appendTimelineEvent(orderId, {
    eventType,
    label,
    description,
    timestamp: update.timestamp,
    isCurrent: true,
  });
}
