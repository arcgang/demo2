export interface PlanOffer {
  id: string;
  name: string;
  data: string;
  pricePerMonth: number;
  currency: string;
}

export const catalogPlans: PlanOffer[] = [
  { id: 'plan_flexi_basic', name: 'Flexi Basic', data: '5GB', pricePerMonth: 299, currency: 'ZAR' },
  { id: 'plan_unlimited_20gb', name: 'Unlimited 20GB', data: '20GB', pricePerMonth: 799, currency: 'ZAR' },
  { id: 'plan_red_premium', name: 'Red Premium', data: '50GB', pricePerMonth: 1199, currency: 'ZAR' },
];
