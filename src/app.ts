import express from 'express';
import { upsellOffersRouter } from './modules/catalog/offers/upsell-offers.router';
import { catalogRouter } from './modules/catalog/catalog.router';
import { ordersRouter } from './modules/orders/orders.router';
import { apiOrdersRouter } from './modules/orders/api-orders.router';
import { checkoutConfirmationRouter } from './modules/orders/checkout-confirmation.router';

export const app = express();

app.use(express.json());

app.use('/api/offers', upsellOffersRouter);
app.use('/api/orders', apiOrdersRouter);
app.use('/orders', ordersRouter);
app.use('/', checkoutConfirmationRouter);
app.use('/', catalogRouter);
