import {
  OnboardingSessionRequest,
  OnboardingSessionResponse,
  OnboardingStage,
  VerificationStatus,
} from '../../types/shared';

interface VerificationCase {
  sessionId: string;
  completedStages: OnboardingStage[];
  data: Record<string, unknown>;
}

const STAGE_ORDER: OnboardingStage[] = ['personal', 'address', 'rica'];

// Keyed by the stage being collected — returns the fields the frontend must render for that stage
const STAGE_FIELDS: Record<OnboardingStage, string[]> = {
  personal: ['firstName', 'lastName', 'idDocumentType', 'idDocumentNumber'],
  address: ['addressLine1', 'city', 'postalCode', 'country'],
  rica: ['msisdn', 'ownershipConfirmed'],
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
  return STAGE_FIELDS[currentStage as OnboardingStage] ?? [];
}

function deriveVerificationStatus(completedStages: OnboardingStage[]): VerificationStatus {
  if (completedStages.includes('rica')) return 'PENDING_REVIEW';
  return 'INCOMPLETE';
}

// ---------------------------------------------------------------------------
// Repository abstraction — in-memory for tests, PostgreSQL in production
// ---------------------------------------------------------------------------

interface IVerificationCaseRepository {
  generateId(): string;
  findById(sessionId: string): Promise<VerificationCase | undefined>;
  save(session: VerificationCase): Promise<void>;
}

// Minimal pg Pool interface — avoids compile-time dependency on @types/pg
interface PgPool {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

class InMemoryVerificationCaseRepository implements IVerificationCaseRepository {
  private store = new Map<string, VerificationCase>();
  private counter = 1;

  generateId(): string {
    return `vsess_${(this.counter++).toString().padStart(4, '0')}`;
  }

  async findById(sessionId: string): Promise<VerificationCase | undefined> {
    return this.store.get(sessionId);
  }

  async save(session: VerificationCase): Promise<void> {
    this.store.set(session.sessionId, session);
  }

  reset(): void {
    this.store.clear();
    this.counter = 1;
  }
}

class PostgresVerificationCaseRepository implements IVerificationCaseRepository {
  private pool: PgPool;
  private counter = 1;

  constructor(connectionString: string) {
    // Dynamic require avoids compile-time dependency on the pg package
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pool } = require('pg') as { Pool: new (cfg: { connectionString: string }) => PgPool };
    this.pool = new Pool({ connectionString });
    void this.ensureTable();
  }

  generateId(): string {
    return `vsess_${(this.counter++).toString().padStart(4, '0')}`;
  }

  private async ensureTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS verification_case_sessions (
        session_id  VARCHAR(64)  PRIMARY KEY,
        completed_stages TEXT[]  NOT NULL DEFAULT '{}',
        data        JSONB        NOT NULL DEFAULT '{}'
      )
    `);
  }

  async findById(sessionId: string): Promise<VerificationCase | undefined> {
    const result = await this.pool.query(
      'SELECT session_id, completed_stages, data FROM verification_case_sessions WHERE session_id = $1',
      [sessionId],
    );
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      sessionId: row['session_id'] as string,
      completedStages: row['completed_stages'] as OnboardingStage[],
      data: row['data'] as Record<string, unknown>,
    };
  }

  async save(session: VerificationCase): Promise<void> {
    await this.pool.query(
      `INSERT INTO verification_case_sessions (session_id, completed_stages, data)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id) DO UPDATE
         SET completed_stages = EXCLUDED.completed_stages,
             data = EXCLUDED.data`,
      [session.sessionId, session.completedStages, JSON.stringify(session.data)],
    );
  }
}

// ---------------------------------------------------------------------------
// Active repository — PostgreSQL when DATABASE_URL is set and pg is installed,
// in-memory otherwise (falls back gracefully when pg is not available)
// ---------------------------------------------------------------------------

const inMemoryRepo = new InMemoryVerificationCaseRepository();

function createRepository(): IVerificationCaseRepository {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return inMemoryRepo;
  try {
    require.resolve('pg');
    return new PostgresVerificationCaseRepository(dbUrl);
  } catch {
    return inMemoryRepo;
  }
}

const repository: IVerificationCaseRepository = createRepository();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function processOnboardingSession(
  req: OnboardingSessionRequest,
): Promise<OnboardingSessionResponse> {
  const incomingStage = (req.stage ?? 'personal') as OnboardingStage;

  let session: VerificationCase | undefined;

  if (req.sessionId) {
    session = await repository.findById(req.sessionId);
  }

  if (!session) {
    session = {
      sessionId: repository.generateId(),
      completedStages: [],
      data: {},
    };
  }

  Object.assign(session.data, req.data);

  if (!session.completedStages.includes(incomingStage)) {
    session.completedStages.push(incomingStage);
  }

  await repository.save(session);

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

// Exported for test isolation — resets the in-memory store
export function clearSessions(): void {
  inMemoryRepo.reset();
}
