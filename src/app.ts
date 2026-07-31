import express from 'express';
import { upsellOffersRouter } from './modules/catalog/offers/upsell-offers.router';
import { catalogRouter } from './modules/catalog/catalog.router';

export const app = express();

app.use(express.json());

app.use('/api/offers', upsellOffersRouter);
app.use('/', catalogRouter);
