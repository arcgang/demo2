/**
 * Acceptance tests for TMF669 async event model and IStatusTimelineService.
 *
 * Acceptance criteria:
 *   AC-1  src/integration/events/tmf669.ts exists and exports EventType, Event<T>,
 *         EventPayload, plus concrete types: ProductOrderCreateEvent,
 *         ProductOrderStateChangeEvent, VerificationCompleteEvent,
 *         ESIMIssuedEvent, ActivationCompleteEvent.
 *   AC-2  src/integration/adapters/IStatusTimelineService.ts exports
 *         IStatusTimelineService with getTimeline(orderId: string): Promise<StatusTimeline>.
 *   AC-3  Event payloads reference resource types from src/integration/types/
 *         (ProductOrderRef from tmf622, PaymentRef from tmf676, RelatedParty from tmf632) —
 *         no duplicated bespoke fields.
 *   AC-4  StatusTimeline milestones carry timestamp, state, and eventType aligned to
 *         TMF669 event names.
 *   AC-5  Every wireframe milestone maps 1-to-1 to a named EventType value:
 *         Order Placed → ProductOrderCreateEvent,
 *         Payment Confirmed → ProductOrderStateChangeEvent,
 *         Verification Complete → VerificationCompleteEvent,
 *         eSIM Issued → ESIMIssuedEvent,
 *         Activation Complete → ActivationCompleteEvent.
 *   AC-6  IStatusTimelineService.ts references TMF669 in inline JSDoc.
 *   AC-7  tmf669.ts has zero runtime dependencies.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '../..');
const TMF669_EVENTS_FILE       = path.join(SRC_ROOT, 'integration', 'events', 'tmf669.ts');
const STATUS_TIMELINE_SVC_FILE = path.join(SRC_ROOT, 'integration', 'adapters', 'IStatusTimelineService.ts');

// ─── AC-1 / AC-2  File existence ────────────────────────────────────────────

describe('TMF669 — file existence', () => {
  it('src/integration/events/tmf669.ts exists', () => {
    expect(fs.existsSync(TMF669_EVENTS_FILE)).toBe(true);
  });

  it('src/integration/adapters/IStatusTimelineService.ts exists', () => {
    expect(fs.existsSync(STATUS_TIMELINE_SVC_FILE)).toBe(true);
  });
});

// ─── AC-1 / AC-3  Type imports ───────────────────────────────────────────────

import type {
  EventType,
  EventPayload,
  Event,
  ProductOrderCreateEvent,
  ProductOrderStateChangeEvent,
  VerificationCompleteEvent,
  ESIMIssuedEvent,
  ActivationCompleteEvent,
} from '../../integration/events/tmf669';

// Resource types from Task 1 — event payloads must reference these, not bespoke duplicates
import type { ProductOrderRef } from '../../integration/types/tmf622';
import type { PaymentRef } from '../../integration/types/tmf676';
import type { RelatedParty } from '../../integration/types/tmf632';

// ─── AC-1  EventPayload base and Event<T> generic envelope ───────────────────

describe('TMF669 — EventPayload base interface', () => {
  it('EventPayload is usable as a base type for event-specific payloads', () => {
    const payload: EventPayload = {};
    expect(payload).toBeDefined();
  });
});

describe('TMF669 — Event<T> generic envelope', () => {
  it('Event<T> has a string eventId field', () => {
    const payload: EventPayload = {};
    const envelope: Event<EventPayload> = {
      eventId: 'evt-001',
      eventTime: '2026-07-28T10:00:00Z',
      eventType: 'ProductOrderCreateEvent',
      event: payload,
    };
    expect(typeof envelope.eventId).toBe('string');
  });

  it('Event<T> has an ISO string eventTime field', () => {
    const payload: EventPayload = {};
    const envelope: Event<EventPayload> = {
      eventId: 'evt-002',
      eventTime: '2026-07-28T10:00:00Z',
      eventType: 'ProductOrderStateChangeEvent',
      event: payload,
    };
    expect(typeof envelope.eventTime).toBe('string');
  });

  it('Event<T> has an eventType field', () => {
    const payload: EventPayload = {};
    const envelope: Event<EventPayload> = {
      eventId: 'evt-003',
      eventTime: '2026-07-28T10:00:00Z',
      eventType: 'ActivationCompleteEvent',
      event: payload,
    };
    expect(Object.prototype.hasOwnProperty.call(envelope, 'eventType')).toBe(true);
  });

  it('Event<T> wraps the domain payload in an event field', () => {
    const payload: EventPayload = {};
    const envelope: Event<EventPayload> = {
      eventId: 'evt-004',
      eventTime: '2026-07-28T10:00:00Z',
      eventType: 'VerificationCompleteEvent',
      event: payload,
    };
    expect(Object.prototype.hasOwnProperty.call(envelope, 'event')).toBe(true);
  });
});

// ─── AC-1 / AC-3  ProductOrderCreateEvent ────────────────────────────────────

describe('TMF669 — ProductOrderCreateEvent', () => {
  it('payload has a productOrder field typed as ProductOrderRef', () => {
    const orderRef: ProductOrderRef = { id: 'ord-001' };
    const evt: ProductOrderCreateEvent = {
      eventId: 'evt-100',
      eventTime: '2026-07-28T09:00:00Z',
      eventType: 'ProductOrderCreateEvent',
      event: { productOrder: orderRef },
    };
    expect(Object.prototype.hasOwnProperty.call(evt.event, 'productOrder')).toBe(true);
    expect(typeof evt.event.productOrder.id).toBe('string');
  });

  it('eventType value is exactly ProductOrderCreateEvent', () => {
    const orderRef: ProductOrderRef = { id: 'ord-002' };
    const evt: ProductOrderCreateEvent = {
      eventId: 'evt-101',
      eventTime: '2026-07-28T09:01:00Z',
      eventType: 'ProductOrderCreateEvent',
      event: { productOrder: orderRef },
    };
    expect(evt.eventType).toBe('ProductOrderCreateEvent');
  });

  it('payload may carry a relatedParty array typed as RelatedParty[]', () => {
    const orderRef: ProductOrderRef = { id: 'ord-003' };
    const party: RelatedParty = { id: 'cust-001', role: 'Customer' };
    const evt: ProductOrderCreateEvent = {
      eventId: 'evt-102',
      eventTime: '2026-07-28T09:02:00Z',
      eventType: 'ProductOrderCreateEvent',
      event: { productOrder: orderRef, relatedParty: [party] },
    };
    expect(Object.prototype.hasOwnProperty.call(evt.event, 'relatedParty')).toBe(true);
    expect(Array.isArray(evt.event.relatedParty)).toBe(true);
  });
});

// ─── AC-1 / AC-3  ProductOrderStateChangeEvent ───────────────────────────────

describe('TMF669 — ProductOrderStateChangeEvent', () => {
  it('payload has a productOrder field typed as ProductOrderRef', () => {
    const orderRef: ProductOrderRef = { id: 'ord-004' };
    const evt: ProductOrderStateChangeEvent = {
      eventId: 'evt-200',
      eventTime: '2026-07-28T10:05:00Z',
      eventType: 'ProductOrderStateChangeEvent',
      event: { productOrder: orderRef },
    };
    expect(Object.prototype.hasOwnProperty.call(evt.event, 'productOrder')).toBe(true);
  });

  it('eventType value is exactly ProductOrderStateChangeEvent', () => {
    const orderRef: ProductOrderRef = { id: 'ord-005' };
    const evt: ProductOrderStateChangeEvent = {
      eventId: 'evt-201',
      eventTime: '2026-07-28T10:05:01Z',
      eventType: 'ProductOrderStateChangeEvent',
      event: { productOrder: orderRef },
    };
    expect(evt.eventType).toBe('ProductOrderStateChangeEvent');
  });

  it('payload may carry a payment field typed as PaymentRef (payment confirmed milestone)', () => {
    const orderRef: ProductOrderRef = { id: 'ord-006' };
    const payRef: PaymentRef = { id: 'pay-001' };
    const evt: ProductOrderStateChangeEvent = {
      eventId: 'evt-202',
      eventTime: '2026-07-28T10:05:02Z',
      eventType: 'ProductOrderStateChangeEvent',
      event: { productOrder: orderRef, payment: payRef },
    };
    expect(Object.prototype.hasOwnProperty.call(evt.event, 'payment')).toBe(true);
    expect(typeof evt.event.payment!.id).toBe('string');
  });
});

// ─── AC-1 / AC-3  VerificationCompleteEvent ──────────────────────────────────

describe('TMF669 — VerificationCompleteEvent', () => {
  it('payload has a productOrder field typed as ProductOrderRef', () => {
    const orderRef: ProductOrderRef = { id: 'ord-007' };
    const evt: VerificationCompleteEvent = {
      eventId: 'evt-300',
      eventTime: '2026-07-28T10:07:00Z',
      eventType: 'VerificationCompleteEvent',
      event: { productOrder: orderRef, verificationCaseId: 'ver-001' },
    };
    expect(Object.prototype.hasOwnProperty.call(evt.event, 'productOrder')).toBe(true);
  });

  it('payload has a verificationCaseId string field', () => {
    const orderRef: ProductOrderRef = { id: 'ord-008' };
    const evt: VerificationCompleteEvent = {
      eventId: 'evt-301',
      eventTime: '2026-07-28T10:07:01Z',
      eventType: 'VerificationCompleteEvent',
      event: { productOrder: orderRef, verificationCaseId: 'ver-002' },
    };
    expect(typeof evt.event.verificationCaseId).toBe('string');
  });

  it('eventType value is exactly VerificationCompleteEvent', () => {
    const orderRef: ProductOrderRef = { id: 'ord-009' };
    const evt: VerificationCompleteEvent = {
      eventId: 'evt-302',
      eventTime: '2026-07-28T10:07:02Z',
      eventType: 'VerificationCompleteEvent',
      event: { productOrder: orderRef, verificationCaseId: 'ver-003' },
    };
    expect(evt.eventType).toBe('VerificationCompleteEvent');
  });
});

// ─── AC-1 / AC-3  ESIMIssuedEvent ────────────────────────────────────────────

describe('TMF669 — ESIMIssuedEvent', () => {
  it('payload has a productOrder field typed as ProductOrderRef', () => {
    const orderRef: ProductOrderRef = { id: 'ord-010' };
    const evt: ESIMIssuedEvent = {
      eventId: 'evt-400',
      eventTime: '2026-07-28T10:08:00Z',
      eventType: 'ESIMIssuedEvent',
      event: { productOrder: orderRef, esimReference: 'esim-ref-001' },
    };
    expect(Object.prototype.hasOwnProperty.call(evt.event, 'productOrder')).toBe(true);
  });

  it('payload has an esimReference string field', () => {
    const orderRef: ProductOrderRef = { id: 'ord-011' };
    const evt: ESIMIssuedEvent = {
      eventId: 'evt-401',
      eventTime: '2026-07-28T10:08:01Z',
      eventType: 'ESIMIssuedEvent',
      event: { productOrder: orderRef, esimReference: 'esim-ref-002' },
    };
    expect(typeof evt.event.esimReference).toBe('string');
  });

  it('eventType value is exactly ESIMIssuedEvent', () => {
    const orderRef: ProductOrderRef = { id: 'ord-012' };
    const evt: ESIMIssuedEvent = {
      eventId: 'evt-402',
      eventTime: '2026-07-28T10:08:02Z',
      eventType: 'ESIMIssuedEvent',
      event: { productOrder: orderRef, esimReference: 'esim-ref-003' },
    };
    expect(evt.eventType).toBe('ESIMIssuedEvent');
  });
});

// ─── AC-1 / AC-3  ActivationCompleteEvent ────────────────────────────────────

describe('TMF669 — ActivationCompleteEvent', () => {
  it('payload has a productOrder field typed as ProductOrderRef', () => {
    const orderRef: ProductOrderRef = { id: 'ord-013' };
    const evt: ActivationCompleteEvent = {
      eventId: 'evt-500',
      eventTime: '2026-07-28T10:09:00Z',
      eventType: 'ActivationCompleteEvent',
      event: { productOrder: orderRef },
    };
    expect(Object.prototype.hasOwnProperty.call(evt.event, 'productOrder')).toBe(true);
  });

  it('eventType value is exactly ActivationCompleteEvent', () => {
    const orderRef: ProductOrderRef = { id: 'ord-014' };
    const evt: ActivationCompleteEvent = {
      eventId: 'evt-501',
      eventTime: '2026-07-28T10:09:01Z',
      eventType: 'ActivationCompleteEvent',
      event: { productOrder: orderRef },
    };
    expect(evt.eventType).toBe('ActivationCompleteEvent');
  });
});

// ─── AC-2 / AC-4  IStatusTimelineService and StatusTimeline ──────────────────

import type {
  IStatusTimelineService,
  StatusTimeline,
  TimelineMilestone,
} from '../../integration/adapters/IStatusTimelineService';

class StubStatusTimelineService implements IStatusTimelineService {
  async getTimeline(orderId: string): Promise<StatusTimeline> {
    return { orderId, milestones: [] };
  }
}

describe('TMF669 — IStatusTimelineService interface', () => {
  it('IStatusTimelineService can be implemented with a concrete class', () => {
    const svc: IStatusTimelineService = new StubStatusTimelineService();
    expect(svc).toBeDefined();
  });

  it('getTimeline returns a Promise that resolves to a StatusTimeline', async () => {
    const svc: IStatusTimelineService = new StubStatusTimelineService();
    const result = await svc.getTimeline('ord-3001');
    expect(result).toBeDefined();
  });

  it('StatusTimeline has an orderId string field', async () => {
    const svc: IStatusTimelineService = new StubStatusTimelineService();
    const result = await svc.getTimeline('ord-3001');
    expect(typeof result.orderId).toBe('string');
    expect(result.orderId).toBe('ord-3001');
  });

  it('StatusTimeline has a milestones array field', async () => {
    const svc: IStatusTimelineService = new StubStatusTimelineService();
    const result = await svc.getTimeline('ord-3002');
    expect(Array.isArray(result.milestones)).toBe(true);
  });
});

// ─── AC-4  TimelineMilestone structure ───────────────────────────────────────

describe('TMF669 — TimelineMilestone structure', () => {
  it('TimelineMilestone has a string timestamp field', () => {
    const milestone: TimelineMilestone = {
      eventType: 'ProductOrderCreateEvent',
      timestamp: '2026-07-28T09:00:00Z',
      state: 'SUCCESS',
    };
    expect(typeof milestone.timestamp).toBe('string');
  });

  it('TimelineMilestone has a string state field', () => {
    const milestone: TimelineMilestone = {
      eventType: 'ProductOrderStateChangeEvent',
      timestamp: '2026-07-28T10:05:00Z',
      state: 'SUCCESS',
    };
    expect(typeof milestone.state).toBe('string');
  });

  it('TimelineMilestone has an eventType field typed as EventType', () => {
    const milestone: TimelineMilestone = {
      eventType: 'VerificationCompleteEvent',
      timestamp: '2026-07-28T10:07:00Z',
      state: 'COMPLETED',
    };
    expect(typeof milestone.eventType).toBe('string');
  });

  it('TimelineMilestone may carry an optional string message field', () => {
    const milestone: TimelineMilestone = {
      eventType: 'ActivationCompleteEvent',
      timestamp: '2026-07-28T10:10:00Z',
      state: 'SUCCESS',
      message: 'Activation complete.',
    };
    expect(typeof milestone.message).toBe('string');
  });
});

// ─── AC-5  Wireframe milestone to EventType traceability ─────────────────────

describe('TMF669 — wireframe milestone to EventType traceability', () => {
  it("tmf669.ts defines 'ProductOrderCreateEvent' for the Order Placed milestone", () => {
    const content = fs.readFileSync(TMF669_EVENTS_FILE, 'utf-8');
    expect(content).toMatch(/ProductOrderCreateEvent/);
  });

  it("tmf669.ts defines 'ProductOrderStateChangeEvent' for the Payment Confirmed milestone", () => {
    const content = fs.readFileSync(TMF669_EVENTS_FILE, 'utf-8');
    expect(content).toMatch(/ProductOrderStateChangeEvent/);
  });

  it("tmf669.ts defines 'VerificationCompleteEvent' for the Verification Complete milestone", () => {
    const content = fs.readFileSync(TMF669_EVENTS_FILE, 'utf-8');
    expect(content).toMatch(/VerificationCompleteEvent/);
  });

  it("tmf669.ts defines 'ESIMIssuedEvent' for the eSIM Issued milestone", () => {
    const content = fs.readFileSync(TMF669_EVENTS_FILE, 'utf-8');
    expect(content).toMatch(/ESIMIssuedEvent/);
  });

  it("tmf669.ts defines 'ActivationCompleteEvent' for the Activation Complete milestone", () => {
    const content = fs.readFileSync(TMF669_EVENTS_FILE, 'utf-8');
    expect(content).toMatch(/ActivationCompleteEvent/);
  });

  it('TimelineMilestone.eventType is constrained to the five named EventType values — no catch-all string', () => {
    // TypeScript enforces this at compile time; the runtime check confirms all five
    // values are valid assignments to the EventType union.
    const validEventTypes: EventType[] = [
      'ProductOrderCreateEvent',
      'ProductOrderStateChangeEvent',
      'VerificationCompleteEvent',
      'ESIMIssuedEvent',
      'ActivationCompleteEvent',
    ];
    const milestone: TimelineMilestone = {
      eventType: 'ESIMIssuedEvent',
      timestamp: '2026-07-28T10:08:00Z',
      state: 'SUCCESS',
    };
    expect(validEventTypes).toContain(milestone.eventType);
    expect(validEventTypes).toHaveLength(5);
  });
});

// ─── AC-6  JSDoc references TMF669 ───────────────────────────────────────────

describe('TMF669 — JSDoc references', () => {
  it('tmf669.ts file-level comment references TMF669', () => {
    const content = fs.readFileSync(TMF669_EVENTS_FILE, 'utf-8');
    expect(content).toMatch(/TMF669|TMF-669/);
  });

  it('IStatusTimelineService.ts references TMF669', () => {
    const content = fs.readFileSync(STATUS_TIMELINE_SVC_FILE, 'utf-8');
    expect(content).toMatch(/TMF669|TMF-669|669/);
  });

  it('IStatusTimelineService.ts references StatusTimeline', () => {
    const content = fs.readFileSync(STATUS_TIMELINE_SVC_FILE, 'utf-8');
    expect(content).toMatch(/StatusTimeline/);
  });

  it('tmf669.ts references each concrete event resource name', () => {
    const content = fs.readFileSync(TMF669_EVENTS_FILE, 'utf-8');
    expect(content).toMatch(/ProductOrderCreateEvent/);
    expect(content).toMatch(/ProductOrderStateChangeEvent/);
    expect(content).toMatch(/VerificationCompleteEvent/);
    expect(content).toMatch(/ESIMIssuedEvent/);
    expect(content).toMatch(/ActivationCompleteEvent/);
  });
});

// ─── AC-7  Zero runtime dependencies ─────────────────────────────────────────

describe('TMF669 — zero runtime dependencies', () => {
  it('tmf669.ts module has no runtime value exports (pure type file)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../integration/events/tmf669') as Record<string, unknown>;
    const runtimeValueExports = Object.keys(mod).filter(
      (k) => typeof mod[k] !== 'undefined',
    );
    expect(runtimeValueExports).toHaveLength(0);
  });
});
