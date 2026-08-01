// Markets that support number porting. Only these may reach the porting endpoint.
const PORTING_SUPPORTED_MARKETS = new Set(['ZA', 'TZ', 'MZ']);

export function isPortingSupported(marketCode: string): boolean {
  return PORTING_SUPPORTED_MARKETS.has(marketCode);
}
