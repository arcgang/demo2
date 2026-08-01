import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const market = await prisma.market.upsert({
    where: { code: 'ZA' },
    update: {},
    create: {
      code: 'ZA',
      name: 'South Africa',
      currency: 'ZAR',
      taxRate: 0.15,
      taxLabel: 'VAT',
      defaultLanguage: 'en-ZA',
    },
  });

  const accessories = await Promise.all([
    prisma.accessory.upsert({
      where: { id: 'acc_case' },
      update: {},
      create: { id: 'acc_case', name: 'Protective Case' },
    }),
    prisma.accessory.upsert({
      where: { id: 'acc_charger' },
      update: {},
      create: { id: 'acc_charger', name: 'Fast Charger' },
    }),
    prisma.accessory.upsert({
      where: { id: 'acc_screen' },
      update: {},
      create: { id: 'acc_screen', name: 'Screen Protector' },
    }),
  ]);

  const sharedPlans = [
    { id: 'plan_red_5gb', name: 'Red 5GB', dataAllowance: '5GB', monthlyPrice: 299, currency: 'ZAR' },
    { id: 'plan_unlimited_20gb', name: 'Unlimited 20GB', dataAllowance: '20GB', monthlyPrice: 799, currency: 'ZAR' },
    { id: 'plan_red_premium', name: 'Red Premium', dataAllowance: 'Unlimited', monthlyPrice: 299, currency: 'ZAR' },
  ];

  const products = [
    { id: 'prod_samsung_s24_ultra', name: 'Samsung Galaxy S24 Ultra', category: 'smartphones', basePrice: 29999, imageUrl: '/images/samsung-s24-ultra.jpg', badges: ['5G', 'Trade-In'], available: true, purchasable: true },
    { id: 'prod_iphone_15_pro', name: 'iPhone 15 Pro', category: 'smartphones', basePrice: 27999, imageUrl: '/images/iphone-15-pro.jpg', badges: ['5G', 'Trade-In'], available: true, purchasable: true },
    { id: 'prod_samsung_s24', name: 'Samsung Galaxy S24', category: 'smartphones', basePrice: 19999, imageUrl: '/images/samsung-s24.jpg', badges: ['5G'], available: true, purchasable: true },
    { id: 'prod_iphone_15', name: 'iPhone 15', category: 'smartphones', basePrice: 18999, imageUrl: '/images/iphone-15.jpg', badges: ['5G', 'Trade-In'], available: true, purchasable: true },
    { id: 'prod_pixel_8_pro', name: 'Google Pixel 8 Pro', category: 'smartphones', basePrice: 16999, imageUrl: '/images/pixel-8-pro.jpg', badges: ['5G'], available: true, purchasable: true },
    { id: 'prod_samsung_a55', name: 'Samsung Galaxy A55', category: 'smartphones', basePrice: 8999, imageUrl: '/images/samsung-a55.jpg', badges: ['5G'], available: true, purchasable: true },
    { id: 'prod_nokia_g42', name: 'Nokia G42', category: 'smartphones', basePrice: 4999, imageUrl: '/images/nokia-g42.jpg', badges: [], available: false, purchasable: false },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        category: p.category,
        basePrice: p.basePrice,
        imageUrl: p.imageUrl,
        badges: p.badges,
      },
    });

    for (const plan of sharedPlans) {
      await prisma.plan.upsert({
        where: { id: `${plan.id}_${product.id}` },
        update: {},
        create: {
          id: `${plan.id}_${product.id}`,
          name: plan.name,
          dataAllowance: plan.dataAllowance,
          monthlyPrice: plan.monthlyPrice,
          currency: plan.currency,
          productId: product.id,
        },
      });
    }

    for (const acc of accessories) {
      await prisma.productAccessory.upsert({
        where: { productId_accessoryId: { productId: product.id, accessoryId: acc.id } },
        update: {},
        create: { productId: product.id, accessoryId: acc.id },
      });
    }

    await prisma.productMarket.upsert({
      where: { productId_marketId: { productId: product.id, marketId: market.id } },
      update: {},
      create: {
        productId: product.id,
        marketId: market.id,
        price: p.basePrice,
        available: p.available,
        purchasable: p.purchasable,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
