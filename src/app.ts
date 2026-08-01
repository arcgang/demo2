import express from 'express';
import { upsellOffersRouter } from './modules/catalog/offers/upsell-offers.router';
import { catalogRouter } from './modules/catalog/catalog.router';
import { ordersRouter, checkoutHandler } from './modules/orders/orders.router';
import { onboardingRouter } from './modules/onboarding/onboarding.router';
import backendOrdersRouter from '../backend/src/routes/orders';
import checkoutRouter from '../backend/src/routes/checkout';

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/offers', upsellOffersRouter);
app.use('/api/orders', backendOrdersRouter);
app.use('/api/checkout', checkoutRouter);
app.get('/checkout', checkoutHandler);
app.use('/orders', ordersRouter);
app.use('/onboarding', onboardingRouter);
app.use('/', catalogRouter);
