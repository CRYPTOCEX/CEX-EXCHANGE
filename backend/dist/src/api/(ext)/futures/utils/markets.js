"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFuturesMarkets = getFuturesMarkets;
const db_1 = require("@b/db");
async function getFuturesMarkets() {
    return db_1.models.futuresMarket.findAll({
        where: {
            status: true,
        },
    });
}
