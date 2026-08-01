import express from 'express';
import { upsellOffersRouter } from './modules/catalog/offers/upsell-offers.router';
import { catalogRouter } from './modules/catalog/catalog.router';
import { ordersRouter } from './modules/orders/orders.router';
import { onboardingRouter } from './modules/onboarding/onboarding.router';
import { marketConfigRouter } from './modules/market/marketConfig.router';

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/config/market', marketConfigRouter);
app.use('/api/offers', upsellOffersRouter);
app.use('/orders', ordersRouter);
app.use('/onboarding', onboardingRouter);
app.use('/', catalogRouter);
