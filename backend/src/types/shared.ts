// Shared TypeScript interfaces for SIM/eSIM catalog, onboarding session, and activation status APIs.
// Frontend tasks can import these without additional coordination.

// ---------------------------------------------------------------------------
// GET /api/catalog/sim-esim
// ---------------------------------------------------------------------------

export interface PlanOption {
  planId: string;
  name: string;
  recurringAmount: number;
  currency: string;
}

export interface OfferPricing {
  onceOff: number;
  currency: string;
}

export type SimEsimType = 'sim' | 'esim';

export interface SimEsimOffer {
  id: string;
  name: string;
  type: SimEsimType;
  planOptions: PlanOption[];
  pricing: OfferPricing;
}

export interface SimEsimCatalogResponse {
  offers: SimEsimOffer[];
}

// ---------------------------------------------------------------------------
// POST /api/onboarding/session
// ---------------------------------------------------------------------------

export type OnboardingStage = 'personal' | 'address' | 'rica';

export type VerificationStatus = 'INCOMPLETE' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';

export interface OnboardingSessionRequest {
  sessionId?: string;
  stage?: OnboardingStage;
  data: Record<string, unknown>;
}

export interface OnboardingSessionResponse {
  sessionId: string;
  currentStage: string;
  completedStages: string[];
  nextStage: string | null;
  requiredFields: string[];
  verificationStatus: VerificationStatus;
}

// ---------------------------------------------------------------------------
// GET /api/activation/:orderId
// ---------------------------------------------------------------------------

export type MilestonePhase = 'fulfilment' | 'activation';

export type MilestoneStatus = 'completed' | 'pending' | 'blocked';

export type ActivationState =
  | 'PENDING'
  | 'ORDER_PLACED'
  | 'PAYMENT_CONFIRMED'
  | 'VERIFICATION_COMPLETE'
  | 'ESIM_ISSUED'
  | 'ESIM_ACTIVATED'
  | 'BLOCKED'
  | 'FAILED';

export interface ActivationMilestone {
  id: string;
  phase: MilestonePhase;
  label: string;
  status: MilestoneStatus;
  timestamp: string | null;
}

export interface ActivationStatusResponse {
  orderId: string;
  activationState: ActivationState;
  milestones: ActivationMilestone[];
}
