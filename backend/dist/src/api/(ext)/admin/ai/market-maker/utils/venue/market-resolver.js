"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAKER_VENUES = void 0;
exports.normaliseVenue = normaliseVenue;
exports.marketSymbol = marketSymbol;
exports.venueMarketModel = venueMarketModel;
exports.venueAvailable = venueAvailable;
exports.toMakerMarket = toMakerMarket;
exports.makerMarketIncludes = makerMarketIncludes;
exports.hydrateMakerMarket = hydrateMakerMarket;
exports.hydrateMakerMarkets = hydrateMakerMarkets;
exports.loadMakerMarket = loadMakerMarket;
exports.loadMarketForMaker = loadMarketForMaker;
exports.loadMarketsForMakers = loadMarketsForMakers;
exports.makerMarketKey = makerMarketKey;
const db_1 = require("@b/db");
exports.MAKER_VENUES = ["ECO", "FUTURES"];
function normaliseVenue(value) {
    const upper = String(value !== null && value !== void 0 ? value : "").toUpperCase();
    return upper === "FUTURES" ? "FUTURES" : "ECO";
}
function marketSymbol(currency, pair) {
    return `${String(currency !== null && currency !== void 0 ? currency : "").toUpperCase()}/${String(pair !== null && pair !== void 0 ? pair : "").toUpperCase()}`;
}
function venueMarketModel(venue) {
    var _a, _b;
    return venue === "FUTURES"
        ? (_a = db_1.models.futuresMarket) !== null && _a !== void 0 ? _a : null : (_b = db_1.models.ecosystemMarket) !== null && _b !== void 0 ? _b : null;
}
function venueAvailable(venue) {
    return venueMarketModel(venue) !== null;
}
function toMakerMarket(row, venue) {
    var _a, _b, _c;
    if (!row)
        return null;
    const currency = row.currency;
    const pair = row.pair;
    return {
        id: row.id,
        venue,
        currency,
        pair,
        symbol: marketSymbol(currency, pair),
        metadata: (_a = row.metadata) !== null && _a !== void 0 ? _a : null,
        status: !!row.status,
        isTrending: (_b = row.isTrending) !== null && _b !== void 0 ? _b : undefined,
        isHot: (_c = row.isHot) !== null && _c !== void 0 ? _c : undefined,
    };
}
function makerMarketIncludes(opts) {
    const attributes = opts === null || opts === void 0 ? void 0 : opts.attributes;
    const shape = {
        ...(attributes ? { attributes } : {}),
        required: false,
        polymorphicGroup: "makerMarket",
    };
    const includes = [
        { model: db_1.models.ecosystemMarket, as: "market", ...shape },
    ];
    const futures = db_1.models.futuresMarket;
    if (futures) {
        includes.push({ model: futures, as: "futuresMarket", ...shape });
    }
    return includes;
}
function hydrateMakerMarket(maker) {
    const row = maker;
    if (!row || typeof row !== "object")
        return maker;
    if (typeof row.then === "function") {
        throw new Error("hydrateMakerMarket was handed a Promise. Await the query first — " +
            "hydration operates on rows, not on the promise of them.");
    }
    const declared = row.marketType;
    const venue = declared === undefined || declared === null
        ? row.futuresMarket
            ? "FUTURES"
            : "ECO"
        : normaliseVenue(declared);
    const raw = venue === "FUTURES" ? row.futuresMarket : row.market;
    const resolved = raw !== null && raw !== void 0 ? raw : null;
    if (typeof row.setDataValue === "function") {
        row.setDataValue("market", resolved);
        if (row.dataValues && "futuresMarket" in row.dataValues) {
            delete row.dataValues.futuresMarket;
        }
    }
    else {
        row.market = resolved;
        delete row.futuresMarket;
    }
    return maker;
}
function hydrateMakerMarkets(makers) {
    for (const maker of makers || [])
        hydrateMakerMarket(maker);
    return makers;
}
async function loadMakerMarket(venue, marketId) {
    const model = venueMarketModel(venue);
    if (!model || !marketId)
        return null;
    const row = await model.findByPk(marketId);
    return toMakerMarket(row, venue);
}
async function loadMarketForMaker(maker) {
    if (!maker)
        return null;
    return loadMakerMarket(normaliseVenue(maker.marketType), maker.marketId);
}
async function loadMarketsForMakers(makers) {
    const byVenue = new Map();
    for (const maker of makers || []) {
        if (!(maker === null || maker === void 0 ? void 0 : maker.marketId))
            continue;
        const venue = normaliseVenue(maker.marketType);
        if (!byVenue.has(venue))
            byVenue.set(venue, new Set());
        byVenue.get(venue).add(maker.marketId);
    }
    const out = new Map();
    await Promise.all(Array.from(byVenue.entries()).map(async ([venue, ids]) => {
        const model = venueMarketModel(venue);
        if (!model || ids.size === 0)
            return;
        const rows = await model.findAll({ where: { id: Array.from(ids) } });
        for (const row of rows) {
            const market = toMakerMarket(row, venue);
            if (market)
                out.set(makerMarketKey(venue, market.id), market);
        }
    }));
    return out;
}
function makerMarketKey(venue, marketId) {
    return `${venue}:${marketId}`;
}
