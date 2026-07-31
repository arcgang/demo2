const RAW_PAN_PATTERN = /^\d{16}$/;

export function containsRawPan(payload: Record<string, unknown>): boolean {
  for (const value of Object.values(payload)) {
    if (typeof value === 'string' && RAW_PAN_PATTERN.test(value)) {
      return true;
    }
  }
  return false;
}
