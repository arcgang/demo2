import express from 'express';
import cookieParser from 'cookie-parser';
import { upsellOffersRouter } from './modules/catalog/offers/upsell-offers.router';
import { marketRouter } from './modules/market/market.router';
import { catalogRouter } from './modules/catalog/catalog.router';
import { cartRouter } from './modules/cart/cart.router';
import { marketPreferenceRouter } from './frontend/market-preference.router';

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/api/offers', upsellOffersRouter);
app.use('/api/markets', marketRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/cart', cartRouter);
app.use('/market', marketPreferenceRouter);
