export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  monthlyFrom: number;
  availableMarkets: string[];
}

export const catalogProducts: CatalogProduct[] = [
  { id: 'iphone-15-pro', name: 'iPhone 15 Pro 256GB', price: 24999, monthlyFrom: 899, availableMarkets: ['ZA', 'KE', 'NG'] },
  { id: 'samsung-s24-ultra', name: 'Samsung Galaxy S24 Ultra 256GB', price: 22999, monthlyFrom: 799, availableMarkets: ['ZA', 'KE', 'NG'] },
  { id: 'iphone-15', name: 'iPhone 15 128GB', price: 18999, monthlyFrom: 699, availableMarkets: ['ZA', 'KE', 'NG'] },
  { id: 'samsung-s24', name: 'Samsung Galaxy S24 256GB', price: 16999, monthlyFrom: 599, availableMarkets: ['ZA', 'KE', 'NG'] },
  { id: 'samsung-a54', name: 'Samsung Galaxy A54 128GB', price: 8999, monthlyFrom: 349, availableMarkets: ['ZA', 'KE', 'NG'] },
  { id: 'iphone-14', name: 'iPhone 14 128GB', price: 15999, monthlyFrom: 579, availableMarkets: ['ZA', 'KE', 'NG'] },
  { id: 'za-only-product', name: 'ZA Exclusive Offer', price: 4999, monthlyFrom: 199, availableMarkets: ['ZA'] },
];
