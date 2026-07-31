import { MARKETS, PRODUCTS, PRODUCT_MARKETS } from '../../data/seed';
import { MarketContext } from '../market/market-context.service';

export interface ProductListItem {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  taxRate: number;
  taxLabel: string;
  purchasable: boolean;
  available: boolean;
  badges: string[];
  imageUrl?: string;
}

export interface PlanItem {
  id: string;
  name: string;
  dataAllowance?: string;
  monthlyPrice: number;
  currency: string;
}

export interface AccessoryItem {
  id: string;
  name: string;
}

export interface ProductDetail extends ProductListItem {
  plans: PlanItem[];
  recommendedAccessories: AccessoryItem[];
}

export interface CatalogFilters {
  category?: string;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  storage?: string;
  inStock?: boolean;
}

export class CatalogService {
  listProducts(market: MarketContext, filters: CatalogFilters): ProductListItem[] {
    const pmIndex = this.buildProductMarketIndex(market.code);

    return PRODUCTS.filter((product) => {
      const pm = pmIndex.get(product.id);
      if (!pm || !pm.available || !pm.purchasable) return false;

      if (filters.category && product.category.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }

      if (filters.brand) {
        const brand = filters.brand.toLowerCase();
        if (!product.name.toLowerCase().includes(brand)) return false;
      }

      const price = pm.price;

      if (filters.priceMin !== undefined && price < filters.priceMin) return false;
      if (filters.priceMax !== undefined && price > filters.priceMax) return false;

      if (filters.storage && !product.name.toLowerCase().includes(filters.storage.toLowerCase())) {
        return false;
      }

      return true;
    }).map((product) => {
      const pm = pmIndex.get(product.id)!;
      return {
        id: product.id,
        name: product.name,
        category: product.category,
        price: pm.price,
        currency: market.currency,
        taxRate: market.taxRate,
        taxLabel: market.taxLabel,
        purchasable: pm.purchasable,
        available: pm.available,
        badges: product.badges,
        imageUrl: product.imageUrl,
      };
    });
  }

  getProduct(productId: string, market: MarketContext): ProductDetail | null {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return null;

    const pmIndex = this.buildProductMarketIndex(market.code);
    const pm = pmIndex.get(productId);
    if (!pm || !pm.available) return null;

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      price: pm.price,
      currency: market.currency,
      taxRate: market.taxRate,
      taxLabel: market.taxLabel,
      purchasable: pm.purchasable,
      available: pm.available,
      badges: product.badges,
      imageUrl: product.imageUrl,
      plans: product.plans.map((p) => ({
        id: p.id,
        name: p.name,
        dataAllowance: p.dataAllowance,
        monthlyPrice: p.monthlyPrice,
        currency: market.currency,
      })),
      recommendedAccessories: product.recommendedAccessories,
    };
  }

  private buildProductMarketIndex(
    marketCode: string,
  ): Map<string, { price: number; available: boolean; purchasable: boolean }> {
    const index = new Map<string, { price: number; available: boolean; purchasable: boolean }>();
    const market = MARKETS.find((m) => m.code === marketCode.toUpperCase());
    if (!market) return index;
    for (const pm of PRODUCT_MARKETS) {
      if (pm.marketId === market.id) {
        index.set(pm.productId, {
          price: pm.price,
          available: pm.available,
          purchasable: pm.purchasable,
        });
      }
    }
    return index;
  }
}
