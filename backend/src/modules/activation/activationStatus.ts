import {
  ActivationMilestone,
  ActivationState,
  ActivationStatusResponse,
} from '../../types/shared';

// In-memory store of activation records keyed by orderId
const ACTIVATION_RECORDS: Record<string, ActivationStatusResponse> = {
  ord_001: {
    orderId: 'ord_001',
    activationState: 'ESIM_ACTIVATED',
    milestones: [
      { id: 'order_placed',          phase: 'fulfilment', label: 'Order Placed',            status: 'completed', timestamp: '2026-07-28T09:00:00Z' },
      { id: 'payment_confirmed',     phase: 'fulfilment', label: 'Payment Confirmed',        status: 'completed', timestamp: '2026-07-28T09:05:00Z' },
      { id: 'verification_complete', phase: 'fulfilment', label: 'Identity Verified',        status: 'completed', timestamp: '2026-07-28T09:20:00Z' },
      { id: 'esim_issued',           phase: 'fulfilment', label: 'eSIM Issued',              status: 'completed', timestamp: '2026-07-28T09:25:00Z' },
      { id: 'esim_activated',        phase: 'activation', label: 'eSIM Activated',           status: 'completed', timestamp: '2026-07-28T09:30:00Z' },
    ],
  },
  ord_002: {
    orderId: 'ord_002',
    activationState: 'PAYMENT_CONFIRMED',
    milestones: [
      { id: 'order_placed',          phase: 'fulfilment', label: 'Order Placed',            status: 'completed', timestamp: '2026-07-28T10:00:00Z' },
      { id: 'payment_confirmed',     phase: 'fulfilment', label: 'Payment Confirmed',        status: 'completed', timestamp: '2026-07-28T10:05:00Z' },
      { id: 'verification_complete', phase: 'fulfilment', label: 'Identity Verified',        status: 'pending',   timestamp: null },
      { id: 'esim_issued',           phase: 'fulfilment', label: 'eSIM Issued',              status: 'pending',   timestamp: null },
      { id: 'esim_activated',        phase: 'activation', label: 'eSIM Activated',           status: 'pending',   timestamp: null },
    ],
  },
  ord_003: {
    orderId: 'ord_003',
    activationState: 'BLOCKED',
    milestones: [
      { id: 'order_placed',          phase: 'fulfilment', label: 'Order Placed',            status: 'completed', timestamp: '2026-07-28T11:00:00Z' },
      { id: 'payment_confirmed',     phase: 'fulfilment', label: 'Payment Confirmed',        status: 'completed', timestamp: '2026-07-28T11:05:00Z' },
      { id: 'verification_complete', phase: 'fulfilment', label: 'Identity Verified',        status: 'blocked',   timestamp: null },
      { id: 'esim_issued',           phase: 'fulfilment', label: 'eSIM Issued',              status: 'blocked',   timestamp: null },
      { id: 'esim_activated',        phase: 'activation', label: 'eSIM Activated',           status: 'blocked',   timestamp: null },
    ],
  },
};

// Build a default activation record for any unknown orderId so the service
// is flexible without requiring pre-seeded data for every test orderId.
function buildDefaultRecord(orderId: string): ActivationStatusResponse {
  return {
    orderId,
    activationState: 'PENDING' as ActivationState,
    milestones: [
      { id: 'order_placed',          phase: 'fulfilment', label: 'Order Placed',    status: 'pending', timestamp: null },
      { id: 'payment_confirmed',     phase: 'fulfilment', label: 'Payment Confirmed', status: 'pending', timestamp: null },
      { id: 'verification_complete', phase: 'fulfilment', label: 'Identity Verified', status: 'pending', timestamp: null },
      { id: 'esim_issued',           phase: 'fulfilment', label: 'eSIM Issued',      status: 'pending', timestamp: null },
      { id: 'esim_activated',        phase: 'activation', label: 'eSIM Activated',   status: 'pending', timestamp: null },
    ],
  };
}

export function getActivationStatus(orderId: string): ActivationStatusResponse | null {
  // Return seeded record if present
  if (orderId in ACTIVATION_RECORDS) {
    const record = ACTIVATION_RECORDS[orderId];
    return { ...record, milestones: record.milestones.map((m: ActivationMilestone) => ({ ...m })) };
  }

  // Unknown order IDs that match the ord_ prefix convention return a default PENDING record.
  // Any other ID pattern (e.g. bare strings, UUIDs without the prefix) returns null (404).
  if (/^ord_[a-zA-Z0-9_-]+$/.test(orderId)) {
    return { ...buildDefaultRecord(orderId) };
  }

  return null;
}
