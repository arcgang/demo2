export interface EligibilityResult {
  currentPlan: string;
  upgradeWindowOpen: boolean;
  availableDevices: string[];
}

export function checkEligibility(
  _customerId: string,
  _lineId: string,
  _marketCode: string,
): EligibilityResult {
  return {
    currentPlan: 'Red Flexi 1GB',
    upgradeWindowOpen: true,
    availableDevices: ['prod_device_iphone15', 'prod_device_samsung_s24', 'prod_device_pixel8'],
  };
}
