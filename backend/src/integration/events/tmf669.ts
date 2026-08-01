/**
 * TMF669 Event Management — async event envelope and concrete order/activation
 * milestone event types for the Vodacom Shop demo.
 *
 * Each type maps to a TMF669 "Event" resource:
 *   ProductOrderCreateEvent    → Order Placed milestone
 *   ProductOrderStateChangeEvent → Payment Confirmed milestone
 *   VerificationCompleteEvent  → Verification Complete milestone
 *   ESIMIssuedEvent            → eSIM Issued milestone
 *   ActivationCompleteEvent    → Activation Complete milestone
 *
 * Payloads reference resource types from the integration/types layer
 * (TMF622, TMF676, TMF632) — no bespoke field duplication.
 *
 * This file has zero runtime dependencies: all exports are pure TypeScript
 * type/interface declarations.
 */

import type { ProductOrderRef } from '../types/tmf622';
import type { PaymentRef } from '../types/tmf676';
import type { RelatedParty } from '../types/tmf632';

// ─── EventType union ─────────────────────────────────────────────────────────

/** Union of all named TMF669 event type strings. No catch-all string permitted. */
export type EventType =
  | 'ProductOrderCreateEvent'
  | 'ProductOrderStateChangeEvent'
  | 'VerificationCompleteEvent'
  | 'ESIMIssuedEvent'
  | 'ActivationCompleteEvent';

// ─── Base payload ─────────────────────────────────────────────────────────────

/** Base interface for all TMF669 event payloads. */
export interface EventPayload {}

// ─── Generic envelope ────────────────────────────────────────────────────────

/**
 * TMF669 Event envelope. Wraps a domain payload T in the standard
 * eventId / eventTime / eventType / event fields.
 */
export interface Event<T extends EventPayload> {
  /** Unique event identifier. */
  eventId: string;
  /** ISO 8601 timestamp at which the event occurred. */
  eventTime: string;
  /** Discriminator aligned to TMF669 event resource names. */
  eventType: EventType;
  /** Domain-specific payload. */
  event: T;
}

// ─── ProductOrderCreateEvent (Order Placed) ───────────────────────────────────

/** Payload for TMF669 ProductOrderCreateEvent — Order Placed milestone. */
export interface ProductOrderCreatePayload extends EventPayload {
  /** Reference to the created ProductOrder (TMF622). */
  productOrder: ProductOrderRef;
  /** Optional parties associated with the order (TMF632). */
  relatedParty?: RelatedParty[];
}

/** TMF669 ProductOrderCreateEvent — raised when an order is first placed. */
export type ProductOrderCreateEvent = Event<ProductOrderCreatePayload>;

// ─── ProductOrderStateChangeEvent (Payment Confirmed) ────────────────────────

/** Payload for TMF669 ProductOrderStateChangeEvent — Payment Confirmed milestone. */
export interface ProductOrderStateChangePayload extends EventPayload {
  /** Reference to the ProductOrder whose state changed (TMF622). */
  productOrder: ProductOrderRef;
  /** Reference to the confirmed payment (TMF676), present when state change is payment-driven. */
  payment?: PaymentRef;
}

/** TMF669 ProductOrderStateChangeEvent — raised when order state advances (e.g. payment confirmed). */
export type ProductOrderStateChangeEvent = Event<ProductOrderStateChangePayload>;

// ─── VerificationCompleteEvent (Verification Complete) ────────────────────────

/** Payload for TMF669 VerificationCompleteEvent — Verification Complete milestone. */
export interface VerificationCompletePayload extends EventPayload {
  /** Reference to the ProductOrder associated with this verification (TMF622). */
  productOrder: ProductOrderRef;
  /** Internal KYC/RICA verification case identifier. */
  verificationCaseId: string;
}

/** TMF669 VerificationCompleteEvent — raised when KYC/RICA verification completes. */
export type VerificationCompleteEvent = Event<VerificationCompletePayload>;

// ─── ESIMIssuedEvent (eSIM Issued) ────────────────────────────────────────────

/** Payload for TMF669 ESIMIssuedEvent — eSIM Issued milestone. */
export interface ESIMIssuedPayload extends EventPayload {
  /** Reference to the ProductOrder for which the eSIM was issued (TMF622). */
  productOrder: ProductOrderRef;
  /** Provider-assigned eSIM reference identifier. */
  esimReference: string;
}

/** TMF669 ESIMIssuedEvent — raised when an eSIM profile has been issued. */
export type ESIMIssuedEvent = Event<ESIMIssuedPayload>;

// ─── ActivationCompleteEvent (Activation Complete) ───────────────────────────

/** Payload for TMF669 ActivationCompleteEvent — Activation Complete milestone. */
export interface ActivationCompletePayload extends EventPayload {
  /** Reference to the ProductOrder that has been fully activated (TMF622). */
  productOrder: ProductOrderRef;
}

/** TMF669 ActivationCompleteEvent — raised when service activation is complete. */
export type ActivationCompleteEvent = Event<ActivationCompletePayload>;
