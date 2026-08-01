import express from 'express';
import { upsellOffersRouter } from './modules/catalog/offers/upsell-offers.router';
import { catalogRouter } from './modules/catalog/catalog.router';
import { ordersRouter } from './modules/orders/orders.router';
<<<<<<< HEAD
import { apiOrdersRouter } from './modules/orders/api-orders.router';
import { checkoutConfirmationRouter } from './modules/orders/checkout-confirmation.router';
=======
import { onboardingRouter } from './modules/onboarding/onboarding.router';
>>>>>>> origin/main

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/offers', upsellOffersRouter);
app.use('/api/orders', apiOrdersRouter);
app.use('/orders', ordersRouter);
<<<<<<< HEAD
app.use('/', checkoutConfirmationRouter);
=======
app.use('/onboarding', onboardingRouter);
>>>>>>> origin/main
app.use('/', catalogRouter);
