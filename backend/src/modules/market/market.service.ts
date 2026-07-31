import { Market } from './market.model';
import { markets } from './market.fixture';

export function listMarkets(): Market[] {
  return markets;
}

export function getMarketByCode(code: string): Market | undefined {
  return markets.find((m) => m.code === code);
}

export function getDefaultMarket(): Market | undefined {
  return markets.find((m) => m.active);
}
