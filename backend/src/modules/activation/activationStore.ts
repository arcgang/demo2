export interface OrderRecord {
  paymentStatus: string;
  verificationStatus: string;
}

export interface ActivationStatusRecord {
  orderId: string;
  activationState: string;
  esimReference: string;
  activationCode: string;
  smdpAddress: string;
  updatedAt: string;
}

export interface AuditEventRecord {
  auditEventId: string;
  orderId: string;
  eventType: string;
  eventCategory: string;
  actorType: string;
  occurredAt: string;
  payloadJson: Record<string, unknown>;
}

const orders = new Map<string, OrderRecord>();
const activationStatuses: ActivationStatusRecord[] = [];
const auditEvents: AuditEventRecord[] = [];

export function clearAll(): void {
  orders.clear();
  activationStatuses.length = 0;
  auditEvents.length = 0;
}

export function seedOrder(orderId: string, record: OrderRecord): void {
  orders.set(orderId, record);
}

export function getOrder(orderId: string): OrderRecord | undefined {
  return orders.get(orderId);
}

export function getActivationStatusForOrder(orderId: string): ActivationStatusRecord | undefined {
  return activationStatuses.find((s) => s.orderId === orderId);
}

export function persistActivationStatus(record: ActivationStatusRecord): void {
  const index = activationStatuses.findIndex((s) => s.orderId === record.orderId);
  if (index !== -1) {
    activationStatuses[index] = record;
  } else {
    activationStatuses.push(record);
  }
}

export function getActivationStatuses(): ActivationStatusRecord[] {
  return [...activationStatuses];
}

export function persistAuditEvent(event: AuditEventRecord): void {
  auditEvents.push(event);
}

export function getAuditEvents(): AuditEventRecord[] {
  return [...auditEvents];
}
