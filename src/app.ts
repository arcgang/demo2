import express from 'express';
import { upsellOffersRouter } from './modules/catalog/offers/upsell-offers.router';
import { catalogProductsRouter } from './modules/catalog/products/catalog-products.router';

export const app = express();

app.use(express.json());

app.use('/api/offers', upsellOffersRouter);
app.use('/api/catalog', catalogProductsRouter);
