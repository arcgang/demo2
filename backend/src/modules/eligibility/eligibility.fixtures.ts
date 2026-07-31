import { EligibilityResult } from './eligibility.model';

// Today is treated as 2026-08-01 (matches project context).
// Dates chosen to satisfy the deterministic mock rules:
//   contract end ≤ 90 days  → ELIGIBLE
//   91-180 days             → CONDITIONALLY_ELIGIBLE
//   > 180 days              → NOT_ELIGIBLE

interface CustomerSeed {
  customerId: string;
  contractEndDate: string;
}

export const DEMO_CUSTOMERS: Record<string, CustomerSeed> = {
  token_eligible: {
    customerId: 'cust_demo_eligible',
    contractEndDate: '2026-09-30', // ~60 days out → ELIGIBLE
  },
  token_cond: {
    customerId: 'cust_demo_cond',
    contractEndDate: '2026-11-15', // ~106 days out → CONDITIONALLY_ELIGIBLE
  },
  token_not_eligible: {
    customerId: 'cust_demo_not_eligible',
    contractEndDate: '2027-04-01', // ~242 days out → NOT_ELIGIBLE
  },
};

const PLAN_BY_TOKEN: Record<string, { name: string; monthlyCost: number }> = {
  token_eligible: { name: 'Red Premium 20GB', monthlyCost: 799.0 },
  token_cond: { name: 'Red Flexi 10GB', monthlyCost: 499.0 },
  token_not_eligible: { name: 'Basic Connect 5GB', monthlyCost: 249.0 },
};

const UPGRADE_OFFER_IDS = ['offer_upgrade_only_001', 'offer_upgrade_only_002'];

const REFERENCE_DATE = new Date('2026-08-01T00:00:00Z');

function daysUntil(isoDate: string): number {
  const end = new Date(isoDate + 'T00:00:00Z');
  return Math.round((end.getTime() - REFERENCE_DATE.getTime()) / (1000 * 60 * 60 * 24));
}

export function buildEligibilityResult(token: string): EligibilityResult | null {
  const seed = DEMO_CUSTOMERS[token];
  if (!seed) return null;

  const plan = PLAN_BY_TOKEN[token];
  const days = daysUntil(seed.contractEndDate);

  if (days <= 90) {
    return {
      status: 'ELIGIBLE',
      currentPlan: { name: plan.name, monthlyCost: plan.monthlyCost, contractEndDate: seed.contractEndDate },
      nextStepGuidance: [],
      availableUpgradeOfferIds: UPGRADE_OFFER_IDS,
    };
  }

  if (days <= 180) {
    return {
      status: 'CONDITIONALLY_ELIGIBLE',
      currentPlan: { name: plan.name, monthlyCost: plan.monthlyCost, contractEndDate: seed.contractEndDate },
      nextStepGuidance: [
        'Your contract ends in under 6 months — you may be eligible for an early upgrade.',
        'Contact Support to confirm early upgrade terms.',
      ],
      availableUpgradeOfferIds: [],
    };
  }

  return {
    status: 'NOT_ELIGIBLE',
    currentPlan: { name: plan.name, monthlyCost: plan.monthlyCost, contractEndDate: seed.contractEndDate },
    nextStepGuidance: ['Contact Support', 'View your current plan'],
    availableUpgradeOfferIds: [],
  };
}
