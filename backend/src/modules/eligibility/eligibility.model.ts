export type EligibilityStatus = 'ELIGIBLE' | 'CONDITIONALLY_ELIGIBLE' | 'NOT_ELIGIBLE';

export interface CurrentPlan {
  name: string;
  monthlyCost: number;
  contractEndDate: string;
}

export interface EligibilityResult {
  status: EligibilityStatus;
  currentPlan: CurrentPlan;
  nextStepGuidance: string[];
  availableUpgradeOfferIds: string[];
}
