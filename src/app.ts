import express from 'express';
import { upsellOffersRouter } from './modules/catalog/offers/upsell-offers.router';

export const app = express();

app.use(express.json());

app.use('/api/offers', upsellOffersRouter);
