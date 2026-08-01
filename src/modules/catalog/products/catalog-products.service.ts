import { catalogProducts, CatalogProduct, Category } from './catalog-products.fixture';

const CATEGORY_MAP: Record<string, Category> = {
  smartphones: 'smartphones',
  'sim-esim': 'sim-esim',
  accessories: 'accessories',
};

export function listProducts(category?: string): CatalogProduct[] {
  if (!category) return catalogProducts;
  const mapped = CATEGORY_MAP[category];
  if (!mapped) return [];
  return catalogProducts.filter((p) => p.category === mapped);
}

export function getProductBySlug(slug: string): CatalogProduct | undefined {
  return catalogProducts.find((p) => p.slug === slug);
}
