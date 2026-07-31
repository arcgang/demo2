"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MarketContextService_1 = require("./MarketContextService");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    const markets = await MarketContextService_1.MarketContextService.list();
    res.json(markets);
});
router.get('/:code', async (req, res) => {
    const market = await MarketContextService_1.MarketContextService.resolve(req.params['code']);
    if (!market) {
        res.status(404).json({ errorCode: 'MARKET_NOT_FOUND', message: 'Market not found or inactive.' });
        return;
    }
    res.json(market);
});
exports.default = router;
