"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertNoMarketMakers = assertNoMarketMakers;
exports.assertNoMarketMakersFor = assertNoMarketMakersFor;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const market_resolver_1 = require("./market-resolver");
async function assertNoMarketMakers(venue, marketIds) {
    const maker = db_1.models.aiMarketMaker;
    if (!maker)
        return;
    if (!Array.isArray(marketIds) || marketIds.length === 0)
        return;
    let attached;
    try {
        attached = await maker.findAll({
            where: { marketId: marketIds, marketType: venue },
            attributes: ["id", "marketId", "status"],
        });
    }
    catch (error) {
        throw (0, error_1.createError)(503, "Could not check whether these markets have an AI Market Maker attached, so the " +
            "delete was not attempted. Try again in a moment.");
    }
    if (attached.length === 0)
        return;
    const count = attached.length;
    const subject = count === 1 ? "market maker" : "market makers";
    throw (0, error_1.createError)(409, `${count} of these markets still ${count === 1 ? "has an AI" : "have AI"} ${subject} ` +
        `attached, and deleting the market would leave the pool's balance behind an orphan. ` +
        `Delete the ${subject} first from Admin → AI Market Maker, which cancels the resting ` +
        `orders and pays the pool back to your wallet.`);
}
async function assertNoMarketMakersFor(venue, marketIds) {
    return assertNoMarketMakers((0, market_resolver_1.normaliseVenue)(venue), marketIds);
}
