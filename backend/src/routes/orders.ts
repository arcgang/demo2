import { Router, Request, Response } from 'express';

const router = Router();

const KNOWN_SCENARIOS = ['activation_complete', 'pending_verification', 'blocked_verification'] as const;
type ScenarioName = typeof KNOWN_SCENARIOS[number];

interface OldMilestone {
  step: string;
  state: 'completed' | 'pending' | 'blocked';
  timestamp: string | null;
  next_step: string | null;
}

const SCENARIO_MILESTONES: Record<ScenarioName, OldMilestone[]> = {
  activation_complete: [
    { step: 'order_placed',          state: 'completed', timestamp: '2026-07-28T09:00:00Z', next_step: null },
    { step: 'payment_confirmed',     state: 'completed', timestamp: '2026-07-28T09:05:00Z', next_step: null },
    { step: 'verification_complete', state: 'completed', timestamp: '2026-07-28T09:20:00Z', next_step: null },
    { step: 'esim_issued',           state: 'completed', timestamp: '2026-07-28T09:25:00Z', next_step: null },
    { step: 'activation_complete',   state: 'completed', timestamp: '2026-07-28T09:30:00Z', next_step: null },
  ],
  pending_verification: [
    { step: 'order_placed',          state: 'completed', timestamp: '2026-07-28T10:00:00Z', next_step: null },
    { step: 'payment_confirmed',     state: 'completed', timestamp: '2026-07-28T10:05:00Z', next_step: null },
    { step: 'verification_complete', state: 'pending',   timestamp: null,                    next_step: 'Complete identity verification to proceed.' },
    { step: 'esim_issued',           state: 'pending',   timestamp: null,                    next_step: 'Waiting for identity verification.' },
    { step: 'activation_complete',   state: 'pending',   timestamp: null,                    next_step: 'Waiting for eSIM issuance.' },
  ],
  blocked_verification: [
    { step: 'order_placed',          state: 'completed', timestamp: '2026-07-28T11:00:00Z', next_step: null },
    { step: 'payment_confirmed',     state: 'completed', timestamp: '2026-07-28T11:05:00Z', next_step: null },
    { step: 'verification_complete', state: 'blocked',   timestamp: null,                    next_step: 'Verification blocked. Please contact support.' },
    { step: 'esim_issued',           state: 'blocked',   timestamp: null,                    next_step: 'Waiting for verification to unblock.' },
    { step: 'activation_complete',   state: 'blocked',   timestamp: null,                    next_step: 'Waiting for eSIM issuance.' },
  ],
};

router.get('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const scenario = req.query.scenario as string | undefined;

  if (!scenario || !(KNOWN_SCENARIOS as readonly string[]).includes(scenario)) {
    res.status(404).json({ errorCode: 'SCENARIO_NOT_FOUND', message: `No status scenario found for: ${scenario ?? '(none)'}` });
    return;
  }

  const milestones = SCENARIO_MILESTONES[scenario as ScenarioName];
  res.status(200).json({ orderId: id, milestones });
});

export default router;
