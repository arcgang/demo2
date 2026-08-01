import { getSlowAdapterMs } from '../shared/adapterTimeout';

export interface EligibilityResult {
  currentPlan: string;
  upgradeWindowOpen: boolean;
  availableDevices: string[];
}

export function checkEligibility(
  _customerId: string,
  _lineId: string,
  _marketCode: string,
): Promise<EligibilityResult> {
  const delay = getSlowAdapterMs();
  return new Promise<EligibilityResult>((resolve) => {
    setTimeout(() => {
      resolve({
        currentPlan: 'Red Flexi 1GB',
        upgradeWindowOpen: true,
        availableDevices: ['prod_device_iphone15', 'prod_device_samsung_s24', 'prod_device_pixel8'],
      });
    }, delay);
  });
}
