import { Market } from './market.model';

export const markets: Market[] = [
  {
    code: 'ZA',
    name: 'South Africa',
    displayLabel: 'South Africa - ZAR',
    currencySymbol: 'R',
    currencyCode: 'ZAR',
    taxLabel: 'VAT (15%)',
    taxRate: 0.15,
    enabledPaymentMethods: ['card', 'mobile_money'],
    active: true,
  },
  {
    code: 'KE',
    name: 'Kenya',
    displayLabel: 'Kenya - KES',
    currencySymbol: 'KSh',
    currencyCode: 'KES',
    taxLabel: 'VAT (16%)',
    taxRate: 0.16,
    enabledPaymentMethods: ['card'],
    active: true,
  },
  {
    code: 'NG',
    name: 'Nigeria',
    displayLabel: 'Nigeria - NGN',
    currencySymbol: '₦',
    currencyCode: 'NGN',
    taxLabel: 'VAT (7.5%)',
    taxRate: 0.075,
    enabledPaymentMethods: ['card'],
    active: true,
  },
];
