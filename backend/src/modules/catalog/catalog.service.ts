import { prisma } from '../../lib/prisma';
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
  async listProducts(market: MarketContext, filters: CatalogFilters): Promise<ProductListItem[]> {
    const where: Record<string, unknown> = {
      available: true,
      purchasable: true,
      market: { code: market.code },
    };

    const rows = await prisma.productMarket.findMany({
      where,
      include: {
        product: true,
        market: true,
      },
    });

    return rows
      .filter((row) => {
        const product = row.product;

        if (filters.category && product.category.toLowerCase() !== filters.category.toLowerCase()) {
          return false;
        }

        if (filters.brand) {
          const brand = filters.brand.toLowerCase();
          if (!product.name.toLowerCase().includes(brand)) return false;
        }

        if (filters.priceMin !== undefined && row.price < filters.priceMin) return false;
        if (filters.priceMax !== undefined && row.price > filters.priceMax) return false;

        if (filters.storage && !product.name.toLowerCase().includes(filters.storage.toLowerCase())) {
          return false;
        }

        if (filters.inStock !== undefined && !filters.inStock) return false;

        return true;
      })
      .map((row) => ({
        id: row.product.id,
        name: row.product.name,
        category: row.product.category,
        price: row.price,
        currency: market.currency,
        taxRate: market.taxRate,
        taxLabel: market.taxLabel,
        purchasable: row.purchasable,
        available: row.available,
        badges: row.product.badges,
        imageUrl: row.product.imageUrl ?? undefined,
      }));
  }

  async getProduct(productId: string, market: MarketContext): Promise<ProductDetail | null> {
    const pm = await prisma.productMarket.findFirst({
      where: {
        productId,
        market: { code: market.code },
      },
      include: {
        product: {
          include: {
            plans: true,
            accessories: { include: { accessory: true } },
          },
        },
        market: true,
      },
    });

    if (!pm || !pm.available || !pm.purchasable) return null;

    const product = pm.product;

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
      imageUrl: product.imageUrl ?? undefined,
      plans: product.plans.map((p) => ({
        id: p.id,
        name: p.name,
        dataAllowance: p.dataAllowance ?? undefined,
        monthlyPrice: p.monthlyPrice,
        currency: p.currency,
      })),
      recommendedAccessories: pm.product.accessories.map((pa) => ({
        id: pa.accessory.id,
        name: pa.accessory.name,
      })),
    };
  }
}
