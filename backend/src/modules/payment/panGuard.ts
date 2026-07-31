const RAW_PAN_PATTERN = /^\d{16}$/;

function walkLeaves(value: unknown): boolean {
  if (typeof value === 'string') {
    return RAW_PAN_PATTERN.test(value);
  }
  if (Array.isArray(value)) {
    return value.some(walkLeaves);
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(walkLeaves);
  }
  return false;
}

export function containsRawPan(payload: Record<string, unknown>): boolean {
  return walkLeaves(payload);
}
