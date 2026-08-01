/**
 * IStatusTimelineService — adapter interface for aggregating TMF669-aligned
 * order and activation milestone events into a customer-visible status timeline.
 *
 * Implementations pull from persisted source-of-truth records (order, payment,
 * verification, activation) and map each milestone to a named TMF669 EventType,
 * ensuring every status timeline entry is traceable to a concrete event type rather
 * than a free-form string.
 *
 * @see {@link ../events/tmf669} for EventType definitions (TMF669)
 */

import type { EventType } from '../events/tmf669';

// ─── MilestoneState ───────────────────────────────────────────────────────────

/**
 * Permitted state values for a TimelineMilestone.
 *
 * - SUCCESS / COMPLETED — terminal positive states
 * - PENDING             — awaiting processing
 * - FAILED / BLOCKED    — terminal negative states
 */
export type MilestoneState = 'SUCCESS' | 'COMPLETED' | 'PENDING' | 'FAILED' | 'BLOCKED';

// ─── TimelineMilestone ────────────────────────────────────────────────────────

/**
 * A single ordered milestone in the StatusTimeline.
 *
 * eventType is constrained to the five named TMF669 event types:
 *   ProductOrderCreateEvent    → Order Placed
 *   ProductOrderStateChangeEvent → Payment Confirmed
 *   VerificationCompleteEvent  → Verification Complete
 *   ESIMIssuedEvent            → eSIM Issued
 *   ActivationCompleteEvent    → Activation Complete
 */
export interface TimelineMilestone {
  /** TMF669 event type that this milestone corresponds to. */
  eventType: EventType;
  /** ISO 8601 timestamp at which this milestone was recorded. */
  timestamp: string;
  /** Current state of this milestone. */
  state: MilestoneState;
  /** Optional human-readable description shown in the Order Status Timeline screen. */
  message?: string;
}

// ─── StatusTimeline ───────────────────────────────────────────────────────────

/**
 * Ordered list of milestones for a single order, as returned by
 * {@link IStatusTimelineService.getTimeline}.
 *
 * StatusTimeline is the typed response shape for
 * GET /api/orders/{orderId}/status-timeline.
 */
export interface StatusTimeline {
  /** The order identifier this timeline belongs to. */
  orderId: string;
  /** Milestones ordered chronologically, each mapped to a TMF669 EventType. */
  milestones: TimelineMilestone[];
}

// ─── IStatusTimelineService ───────────────────────────────────────────────────

/**
 * Aggregates TMF669 async event milestones for a given order into a
 * customer-visible StatusTimeline.
 *
 * Implementations must derive milestone state from persisted records —
 * not from frontend-inferred state — per VAL-12.
 */
export interface IStatusTimelineService {
  /**
   * Returns the ordered StatusTimeline for the given orderId.
   *
   * @param orderId - The order identifier (public reference or internal UUID).
   * @returns A Promise resolving to the StatusTimeline for that order.
   */
  getTimeline(orderId: string): Promise<StatusTimeline>;
}
