type MilestoneStep =
  | 'order_placed'
  | 'payment_confirmed'
  | 'verification_complete'
  | 'esim_issued'
  | 'activation_complete';

type MilestoneState = 'completed' | 'pending' | 'blocked';

interface Milestone {
  step: MilestoneStep;
  state: MilestoneState;
  timestamp: string | null;
  next_step: string | null;
}

interface StatusResponse {
  orderId: string;
  milestones: Milestone[];
}

function completed(step: MilestoneStep, timestamp: string): Milestone {
  return { step, state: 'completed', timestamp, next_step: null };
}

function pending(step: MilestoneStep, next_step: string): Milestone {
  return { step, state: 'pending', timestamp: null, next_step };
}

function blocked(step: MilestoneStep, next_step: string): Milestone {
  return { step, state: 'blocked', timestamp: null, next_step };
}

const SCENARIOS: Record<string, Milestone[]> = {
  activation_complete: [
    completed('order_placed',          '2026-07-28T09:00:00Z'),
    completed('payment_confirmed',     '2026-07-28T09:05:00Z'),
    completed('verification_complete', '2026-07-28T09:20:00Z'),
    completed('esim_issued',           '2026-07-28T09:25:00Z'),
    completed('activation_complete',   '2026-07-28T09:30:00Z'),
  ],

  pending_verification: [
    completed('order_placed',      '2026-07-28T10:00:00Z'),
    completed('payment_confirmed', '2026-07-28T10:05:00Z'),
    pending('verification_complete', 'Your identity verification is under review. No action needed — we will notify you once complete.'),
    pending('esim_issued',           'eSIM will be issued once verification is complete.'),
    pending('activation_complete',   'Activation will begin after verification and eSIM issuance are complete.'),
  ],

  blocked_verification: [
    completed('order_placed',      '2026-07-28T11:00:00Z'),
    completed('payment_confirmed', '2026-07-28T11:05:00Z'),
    blocked('verification_complete', 'Your identity verification could not be completed. Please resubmit your proof of identity and proof of address documents.'),
    blocked('esim_issued',           'eSIM issuance is on hold until verification is resolved. Please complete the verification step above.'),
    blocked('activation_complete',   'Activation is blocked pending verification resolution. Contact support if you need assistance.'),
  ],
};

export function buildStatusResponse(orderId: string, scenario: string): StatusResponse | null {
  const milestones = SCENARIOS[scenario];
  if (!milestones) return null;
  return { orderId, milestones };
}
