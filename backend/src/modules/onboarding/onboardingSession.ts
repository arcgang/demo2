import {
  OnboardingSessionRequest,
  OnboardingSessionResponse,
  OnboardingStage,
  VerificationStatus,
} from '../../types/shared';

// In-memory VerificationCase store — demo only; not backed by PostgreSQL
interface VerificationCase {
  sessionId: string;
  completedStages: OnboardingStage[];
  data: Record<string, unknown>;
}

const sessions = new Map<string, VerificationCase>();

let sessionCounter = 1;

function generateSessionId(): string {
  return `vsess_${(sessionCounter++).toString().padStart(4, '0')}`;
}

const STAGE_ORDER: OnboardingStage[] = ['personal', 'address', 'rica'];

const NEXT_STAGE_FIELDS: Record<OnboardingStage, string[]> = {
  personal: ['addressLine1', 'city', 'postalCode', 'country'],
  address: ['msisdn', 'ownershipConfirmed'],
  rica: [],
};

function deriveCurrentStage(completedStages: OnboardingStage[]): string {
  for (const stage of STAGE_ORDER) {
    if (!completedStages.includes(stage)) return stage;
  }
  return 'complete';
}

function deriveNextStage(currentStage: string): string | null {
  const idx = STAGE_ORDER.indexOf(currentStage as OnboardingStage);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

function deriveRequiredFields(currentStage: string): string[] {
  return NEXT_STAGE_FIELDS[currentStage as OnboardingStage] ?? [];
}

function deriveVerificationStatus(completedStages: OnboardingStage[]): VerificationStatus {
  if (completedStages.includes('rica')) return 'PENDING_REVIEW';
  return 'INCOMPLETE';
}

export function processOnboardingSession(
  req: OnboardingSessionRequest,
): OnboardingSessionResponse {
  const incomingStage = (req.stage ?? 'personal') as OnboardingStage;

  let session: VerificationCase;

  if (req.sessionId && sessions.has(req.sessionId)) {
    session = sessions.get(req.sessionId)!;
  } else {
    session = {
      sessionId: generateSessionId(),
      completedStages: [],
      data: {},
    };
    sessions.set(session.sessionId, session);
  }

  // Merge submitted data into persistent case
  Object.assign(session.data, req.data);

  // Advance completed stages if not already recorded
  if (!session.completedStages.includes(incomingStage)) {
    session.completedStages.push(incomingStage);
  }

  const currentStage = deriveCurrentStage(session.completedStages);
  const nextStage = deriveNextStage(currentStage);
  const requiredFields = deriveRequiredFields(currentStage);
  const verificationStatus = deriveVerificationStatus(session.completedStages);

  return {
    sessionId: session.sessionId,
    currentStage,
    completedStages: [...session.completedStages],
    nextStage,
    requiredFields,
    verificationStatus,
  };
}

// Exported for test isolation — clears all in-memory state
export function clearSessions(): void {
  sessions.clear();
  sessionCounter = 1;
}
