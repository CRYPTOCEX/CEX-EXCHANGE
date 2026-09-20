"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_LEVEL_TTL_SECONDS = void 0;
exports.insertBotOrder = insertBotOrder;
exports.updateBotOrder = updateBotOrder;
exports.getBotOrdersByMarket = getBotOrdersByMarket;
exports.getBotOrdersByBot = getBotOrdersByBot;
exports.getOpenBotOrders = getOpenBotOrders;
exports.cancelBotOrder = cancelBotOrder;
exports.insertBotTrade = insertBotTrade;
exports.insertBotRealTrade = insertBotRealTrade;
exports.getBotRealTradesInRange = getBotRealTradesInRange;
exports.getBotTradesByMarket = getBotTradesByMarket;
exports.getBotTradesInRange = getBotTradesInRange;
exports.getDailyTradeVolume = getDailyTradeVolume;
exports.insertPriceHistory = insertPriceHistory;
exports.getPriceHistory = getPriceHistory;
exports.getPriceHistoryInRange = getPriceHistoryInRange;
exports.getLatestPrice = getLatestPrice;
exports.calculateVolatility = calculateVolatility;
exports.placeRealOrder = placeRealOrder;
exports.cancelRealOrder = cancelRealOrder;
exports.recordRealLiquidityFill = recordRealLiquidityFill;
exports.syncOrderbookFromAiTrade = syncOrderbookFromAiTrade;
exports.syncTradeToEcosystem = syncTradeToEcosystem;
exports.clearCandlesForSymbol = clearCandlesForSymbol;
exports.clearOrderbookForSymbol = clearOrderbookForSymbol;
exports.forceCleanOrderbook = forceCleanOrderbook;
exports.getLastCandleClosePrice = getLastCandleClosePrice;
exports.syncCandlesFromAiTrade = syncCandlesFromAiTrade;
exports.getRealLiquidityOrdersBySymbol = getRealLiquidityOrdersBySymbol;
exports.calculateLiquiditySplit = calculateLiquiditySplit;
exports.getBotTradeStats = getBotTradeStats;
exports.debugGetAllTrades = debugGetAllTrades;
exports.getRecentBotTrades = getRecentBotTrades;
exports.getMarketTradeStats = getMarketTradeStats;
exports.deleteAiBotOrdersByMarket = deleteAiBotOrdersByMarket;
exports.deleteAiBotTradesByMarket = deleteAiBotTradesByMarket;
exports.deleteAiPriceHistoryByMarket = deleteAiPriceHistoryByMarket;
exports.deleteRealLiquidityOrdersBySymbol = deleteRealLiquidityOrdersBySymbol;
exports.getOpenBotEcosystemOrderIds = getOpenBotEcosystemOrderIds;
exports.cancelOpenBotEcosystemOrders = cancelOpenBotEcosystemOrders;
exports.cleanupMarketMakerData = cleanupMarketMakerData;
const client_1 = __importStar(require("./client"));
const passwords_1 = require("@b/utils/passwords");
const cassandra_driver_1 = require("cassandra-driver");
const console_1 = require("@b/utils/console");
const queries_1 = require("@b/api/(ext)/ecosystem/utils/scylla/queries");
const closeAuthority_1 = require("./closeAuthority");
const adapter_1 = require("../venue/adapter");
const real_liquidity_status_1 = require("./real-liquidity-status");
async function invalidateVenueOrderbook(symbol, venue) {
    try {
        await (0, adapter_1.venueAdapter)(venue).invalidateBook(symbol);
    }
    catch (error) {
        console_1.logger.debug("AI_MM", `Orderbook cache invalidation skipped for ${symbol}`, error);
    }
}
exports.AI_LEVEL_TTL_SECONDS = 120;
function toBigIntSafe(value) {
    if (value === null || value === undefined) {
        return BigInt(0);
    }
    if (typeof value === "bigint") {
        return value;
    }
    return BigInt(value.toString());
}
function mapRowToOrder(row) {
    var _a, _b, _c, _d;
    return {
        marketId: (_a = row.market_id) === null || _a === void 0 ? void 0 : _a.toString(),
        botId: (_b = row.bot_id) === null || _b === void 0 ? void 0 : _b.toString(),
        orderId: (_c = row.order_id) === null || _c === void 0 ? void 0 : _c.toString(),
        side: row.side,
        type: row.type,
        price: toBigIntSafe(row.price),
        amount: toBigIntSafe(row.amount),
        filledAmount: toBigIntSafe(row.filled_amount),
        status: row.status,
        purpose: row.purpose,
        matchedWithBotId: (_d = row.matched_with_bot_id) === null || _d === void 0 ? void 0 : _d.toString(),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function mapRowToTrade(row) {
    var _a, _b, _c, _d, _e, _f;
    return {
        marketId: (_a = row.market_id) === null || _a === void 0 ? void 0 : _a.toString(),
        tradeDate: row.trade_date,
        tradeTime: row.trade_time,
        tradeId: (_b = row.trade_id) === null || _b === void 0 ? void 0 : _b.toString(),
        buyBotId: (_c = row.buy_bot_id) === null || _c === void 0 ? void 0 : _c.toString(),
        sellBotId: (_d = row.sell_bot_id) === null || _d === void 0 ? void 0 : _d.toString(),
        buyOrderId: (_e = row.buy_order_id) === null || _e === void 0 ? void 0 : _e.toString(),
        sellOrderId: (_f = row.sell_order_id) === null || _f === void 0 ? void 0 : _f.toString(),
        price: toBigIntSafe(row.price),
        amount: toBigIntSafe(row.amount),
    };
}
function mapRowToPriceHistory(row) {
    var _a;
    return {
        marketId: (_a = row.market_id) === null || _a === void 0 ? void 0 : _a.toString(),
        timestamp: row.timestamp,
        price: toBigIntSafe(row.price),
        volume: toBigIntSafe(row.volume),
        isAiTrade: row.is_ai_trade,
        source: row.source,
    };
}
async function insertBotOrder(order, createdAt) {
    const orderId = (0, passwords_1.makeUuid)();
    const now = createdAt !== null && createdAt !== void 0 ? createdAt : new Date();
    const query = `
    INSERT INTO ${client_1.aiMarketMakerKeyspace}.ai_bot_orders (
      market_id, bot_id, order_id, side, type, price, amount,
      filled_amount, status, purpose, matched_with_bot_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
    const params = [
        cassandra_driver_1.types.Uuid.fromString(order.marketId),
        cassandra_driver_1.types.Uuid.fromString(order.botId),
        cassandra_driver_1.types.Uuid.fromString(orderId),
        order.side,
        order.type,
        order.price.toString(),
        order.amount.toString(),
        order.filledAmount.toString(),
        order.status,
        order.purpose,
        order.matchedWithBotId ? cassandra_driver_1.types.Uuid.fromString(order.matchedWithBotId) : null,
        now,
        now,
    ];
    await client_1.default.execute(query, params, { prepare: true });
    return orderId;
}
async function updateBotOrder(marketId, orderId, createdAt, updates) {
    const setClauses = [];
    const params = [];
    if (updates.filledAmount !== undefined) {
        setClauses.push("filled_amount = ?");
        params.push(updates.filledAmount.toString());
    }
    if (updates.status !== undefined) {
        setClauses.push("status = ?");
        params.push(updates.status);
    }
    if (updates.matchedWithBotId !== undefined) {
        setClauses.push("matched_with_bot_id = ?");
        params.push(cassandra_driver_1.types.Uuid.fromString(updates.matchedWithBotId));
    }
    setClauses.push("updated_at = ?");
    params.push(new Date());
    params.push(cassandra_driver_1.types.Uuid.fromString(marketId));
    params.push(createdAt);
    params.push(cassandra_driver_1.types.Uuid.fromString(orderId));
    const query = `
    UPDATE ${client_1.aiMarketMakerKeyspace}.ai_bot_orders
    SET ${setClauses.join(", ")}
    WHERE market_id = ? AND created_at = ? AND order_id = ?
  `;
    await client_1.default.execute(query, params, { prepare: true });
    if (updates.status === "FILLED" || updates.status === "CANCELLED") {
        await retireBotOrder(marketId, orderId, createdAt);
    }
}
async function retireBotOrder(marketId, orderId, createdAt) {
    var _a;
    var _b;
    try {
        const market = cassandra_driver_1.types.Uuid.fromString(marketId);
        const order = cassandra_driver_1.types.Uuid.fromString(orderId);
        const existing = await client_1.default.execute(`SELECT market_id, bot_id, order_id, side, type, price, amount, filled_amount,
              status, purpose, matched_with_bot_id, created_at, updated_at
         FROM ${client_1.aiMarketMakerKeyspace}.ai_bot_orders
        WHERE market_id = ? AND created_at = ? AND order_id = ?`, [market, createdAt, order], { prepare: true });
        const row = (_a = existing.rows) === null || _a === void 0 ? void 0 : _a[0];
        if (!row)
            return;
        await client_1.default.execute(`INSERT INTO ${client_1.aiMarketMakerKeyspace}.ai_bot_orders (
         market_id, bot_id, order_id, side, type, price, amount, filled_amount,
         status, purpose, matched_with_bot_id, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) USING TTL ${RETIRED_ORDER_TTL_SECONDS}`, [
            row.market_id,
            row.bot_id,
            row.order_id,
            row.side,
            row.type,
            row.price,
            row.amount,
            row.filled_amount,
            row.status,
            row.purpose,
            row.matched_with_bot_id,
            row.created_at,
            (_b = row.updated_at) !== null && _b !== void 0 ? _b : new Date(),
        ], { prepare: true });
    }
    catch (error) {
        console_1.logger.debug("AI_MM", `Could not set a retention TTL on bot order ${orderId}`, error);
    }
}
async function getBotOrdersByMarket(marketId, limit = 100) {
    const query = `
    SELECT * FROM ${client_1.aiMarketMakerKeyspace}.ai_bot_orders
    WHERE market_id = ?
    LIMIT ?
  `;
    const result = await client_1.default.execute(query, [cassandra_driver_1.types.Uuid.fromString(marketId), limit], { prepare: true });
    return result.rows.map(mapRowToOrder);
}
async function getBotOrdersByBot(botId, limit = 100) {
    const query = `
    SELECT * FROM ${client_1.aiMarketMakerKeyspace}.ai_bot_orders_by_bot
    WHERE bot_id = ?
    LIMIT ?
  `;
    const result = await client_1.default.execute(query, [cassandra_driver_1.types.Uuid.fromString(botId), limit], { prepare: true });
    return result.rows.map(mapRowToOrder);
}
async function getOpenBotOrders(marketId) {
    const query = `
    SELECT * FROM ${client_1.aiMarketMakerKeyspace}.ai_bot_open_orders
    WHERE status = 'OPEN' AND market_id = ?
  `;
    const result = await client_1.default.execute(query, [cassandra_driver_1.types.Uuid.fromString(marketId)], { prepare: true });
    return result.rows.map(mapRowToOrder);
}
async function cancelBotOrder(marketId, orderId, createdAt) {
    await updateBotOrder(marketId, orderId, createdAt, { status: "CANCELLED" });
}
async function insertBotTrade(trade) {
    const tradeId = (0, passwords_1.makeUuid)();
    const now = new Date();
    const tradeDate = new cassandra_driver_1.types.LocalDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const query = `
    INSERT INTO ${client_1.aiMarketMakerKeyspace}.ai_bot_trades (
      market_id, trade_date, trade_time, trade_id, buy_bot_id, sell_bot_id,
      buy_order_id, sell_order_id, price, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
    const params = [
        cassandra_driver_1.types.Uuid.fromString(trade.marketId),
        tradeDate,
        now,
        cassandra_driver_1.types.Uuid.fromString(tradeId),
        cassandra_driver_1.types.Uuid.fromString(trade.buyBotId),
        cassandra_driver_1.types.Uuid.fromString(trade.sellBotId),
        cassandra_driver_1.types.Uuid.fromString(trade.buyOrderId),
        cassandra_driver_1.types.Uuid.fromString(trade.sellOrderId),
        trade.price.toString(),
        trade.amount.toString(),
    ];
    try {
        await client_1.default.execute(query, params, { prepare: true });
    }
    catch (error) {
        console_1.logger.error("AI_MM", `Failed to insert trade for market ${trade.marketId}: ${error}`);
        throw error;
    }
    return tradeId;
}
async function insertBotRealTrade(trade) {
    var _a, _b, _c;
    try {
        const when = (_a = trade.tradeTime) !== null && _a !== void 0 ? _a : new Date();
        const tradeDate = new cassandra_driver_1.types.LocalDate(when.getUTCFullYear(), when.getUTCMonth() + 1, when.getUTCDate());
        const query = `
      INSERT INTO ${client_1.aiMarketMakerKeyspace}.ai_bot_real_trades (
        bot_id, trade_date, trade_time, trade_id, market_id, symbol,
        side, price, amount, fee, is_maker, counterparty_user_id, pnl
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        await client_1.default.execute(query, [
            cassandra_driver_1.types.Uuid.fromString(trade.botId),
            tradeDate,
            when,
            cassandra_driver_1.types.Uuid.fromString((0, passwords_1.makeUuid)()),
            trade.marketId ? cassandra_driver_1.types.Uuid.fromString(trade.marketId) : null,
            trade.symbol,
            trade.side,
            String(trade.price),
            String(trade.amount),
            String((_b = trade.fee) !== null && _b !== void 0 ? _b : 0),
            !!trade.isMaker,
            trade.counterpartyUserId ? cassandra_driver_1.types.Uuid.fromString(trade.counterpartyUserId) : null,
            String((_c = trade.pnl) !== null && _c !== void 0 ? _c : 0),
        ], { prepare: true });
    }
    catch (error) {
        console_1.logger.debug("AI_MM", `Failed to record real trade for bot ${trade.botId}`, error);
    }
}
async function getBotRealTradesInRange(botIds, days, unreadableBots) {
    var _a, _b, _c;
    var _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const out = [];
    if (!botIds.length || days <= 0)
        return out;
    const dates = [];
    const now = new Date();
    for (let i = 0; i < days; i++) {
        const d = new Date(now.getTime() - i * 86400000);
        dates.push(new cassandra_driver_1.types.LocalDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
    }
    const placeholders = dates.map(() => "?").join(", ");
    const query = `
    SELECT trade_id, trade_time, market_id, symbol, side, price, amount, fee,
           is_maker, counterparty_user_id, pnl
    FROM ${client_1.aiMarketMakerKeyspace}.ai_bot_real_trades
    WHERE bot_id = ? AND trade_date IN (${placeholders})
  `;
    for (const botId of botIds) {
        let uuid;
        try {
            uuid = cassandra_driver_1.types.Uuid.fromString(botId);
        }
        catch (_o) {
            unreadableBots === null || unreadableBots === void 0 ? void 0 : unreadableBots.push(botId);
            continue;
        }
        try {
            const result = await client_1.default.execute(query, [uuid, ...dates], { prepare: true });
            for (const row of result.rows) {
                out.push({
                    tradeId: (_d = (_a = row.trade_id) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _d !== void 0 ? _d : "",
                    botId,
                    marketId: (_e = (_b = row.market_id) === null || _b === void 0 ? void 0 : _b.toString()) !== null && _e !== void 0 ? _e : null,
                    symbol: (_f = row.symbol) !== null && _f !== void 0 ? _f : "",
                    side: ((_g = row.side) !== null && _g !== void 0 ? _g : "BUY"),
                    price: Number((_h = row.price) !== null && _h !== void 0 ? _h : 0),
                    amount: Number((_j = row.amount) !== null && _j !== void 0 ? _j : 0),
                    fee: Number((_k = row.fee) !== null && _k !== void 0 ? _k : 0),
                    isMaker: !!row.is_maker,
                    counterpartyUserId: (_l = (_c = row.counterparty_user_id) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _l !== void 0 ? _l : null,
                    pnl: Number((_m = row.pnl) !== null && _m !== void 0 ? _m : 0),
                    tradeTime: row.trade_time,
                });
            }
        }
        catch (error) {
            unreadableBots === null || unreadableBots === void 0 ? void 0 : unreadableBots.push(botId);
            console_1.logger.debug("AI_MM", `Failed to read real trades for bot ${botId}`, error);
        }
    }
    out.sort((a, b) => new Date(b.tradeTime).getTime() - new Date(a.tradeTime).getTime());
    return out;
}
async function getBotTradesByMarket(marketId, date, limit = 100) {
    const tradeDate = new cassandra_driver_1.types.LocalDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const query = `
    SELECT * FROM ${client_1.aiMarketMakerKeyspace}.ai_bot_trades
    WHERE market_id = ? AND trade_date = ?
    LIMIT ?
  `;
    const result = await client_1.default.execute(query, [cassandra_driver_1.types.Uuid.fromString(marketId), tradeDate, limit], { prepare: true });
    return result.rows.map(mapRowToTrade);
}
async function getBotTradesInRange(marketId, startDate, endDate, limit = 1000) {
    const trades = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate && trades.length < limit) {
        const dayTrades = await getBotTradesByMarket(marketId, currentDate, limit - trades.length);
        trades.push(...dayTrades);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return trades;
}
async function getDailyTradeVolume(marketId, date) {
    const trades = await getBotTradesByMarket(marketId, date, 10000);
    return trades.reduce((sum, trade) => sum + trade.amount, BigInt(0));
}
async function insertPriceHistory(history) {
    const query = `
    INSERT INTO ${client_1.aiMarketMakerKeyspace}.ai_price_history (
      market_id, timestamp, price, volume, is_ai_trade, source
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;
    const params = [
        cassandra_driver_1.types.Uuid.fromString(history.marketId),
        new Date(),
        history.price.toString(),
        history.volume.toString(),
        history.isAiTrade,
        history.source,
    ];
    await client_1.default.execute(query, params, { prepare: true });
}
async function getPriceHistory(marketId, limit = 100) {
    const query = `
    SELECT * FROM ${client_1.aiMarketMakerKeyspace}.ai_price_history
    WHERE market_id = ?
    LIMIT ?
  `;
    const result = await client_1.default.execute(query, [cassandra_driver_1.types.Uuid.fromString(marketId), limit], { prepare: true });
    return result.rows.map(mapRowToPriceHistory);
}
async function getPriceHistoryInRange(marketId, startTime, endTime, limit = 1000) {
    const query = `
    SELECT * FROM ${client_1.aiMarketMakerKeyspace}.ai_price_history
    WHERE market_id = ? AND timestamp >= ? AND timestamp <= ?
    LIMIT ?
  `;
    const result = await client_1.default.execute(query, [cassandra_driver_1.types.Uuid.fromString(marketId), startTime, endTime, limit], { prepare: true });
    return result.rows.map(mapRowToPriceHistory);
}
async function getLatestPrice(marketId) {
    const query = `
    SELECT * FROM ${client_1.aiMarketMakerKeyspace}.ai_price_history
    WHERE market_id = ?
    LIMIT 1
  `;
    const result = await client_1.default.execute(query, [cassandra_driver_1.types.Uuid.fromString(marketId)], { prepare: true });
    if (result.rows.length === 0) {
        return null;
    }
    return mapRowToPriceHistory(result.rows[0]);
}
async function calculateVolatility(marketId, minutes = 60) {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - minutes * 60 * 1000);
    const history = await getPriceHistoryInRange(marketId, startTime, endTime, 1000);
    if (history.length < 2) {
        return 0;
    }
    const prices = history.map((h) => Number(h.price));
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1] !== 0) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
    }
    if (returns.length === 0) {
        return 0;
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDiffs = returns.map((r) => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;
    return Math.sqrt(variance) * 100;
}
async function placeRealOrder(symbol, side, price, amount, aiBotOrderId, marketMakerId, botId) {
    const [baseCurrency, quoteCurrency] = symbol.split("/");
    const userId = botId;
    const cost = (price * amount) / BigInt(10 ** 18);
    const fee = BigInt(0);
    const feeCurrency = side === "BUY" ? quoteCurrency : baseCurrency;
    const order = await (0, queries_1.createOrder)({
        userId,
        symbol,
        amount,
        price,
        cost,
        type: "LIMIT",
        side,
        fee,
        feeCurrency,
        marketMakerId,
        botId,
    });
    await trackRealLiquidityOrder({
        aiBotOrderId,
        ecosystemOrderId: order.id,
        botId,
        symbol,
        side,
        price,
        amount,
        createdAt: order.createdAt ? new Date(order.createdAt) : undefined,
    });
    await (0, queries_1.addOrderToMatchingQueue)(order);
    return order;
}
async function cancelRealOrder(ecosystemOrderId, userId, createdAt, symbol, price, side, amount) {
    const cancelled = await (0, queries_1.cancelOrderByUuid)(userId, ecosystemOrderId, createdAt, symbol, price, side, amount);
    if (cancelled) {
        await updateRealLiquidityOrderStatus(ecosystemOrderId, "CANCELLED");
        await evictFromMatcherQueue(ecosystemOrderId, symbol);
    }
    else {
        console_1.logger.warn("AI_MM", `Cancel of ecosystem order ${ecosystemOrderId} (${symbol} ${side}) did not find the ` +
            `order — leaving its tracking row OPEN so it is retried instead of being lost.`);
    }
    return cancelled;
}
async function trackRealLiquidityOrder(params) {
    var _a;
    const query = `
    INSERT INTO ${client_1.aiMarketMakerKeyspace}.ai_real_liquidity_orders (
      ai_order_id, ecosystem_order_id, bot_id, symbol, side, price, amount, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
    await client_1.default.execute(query, [
        cassandra_driver_1.types.Uuid.fromString(params.aiBotOrderId),
        cassandra_driver_1.types.Uuid.fromString(params.ecosystemOrderId),
        cassandra_driver_1.types.Uuid.fromString(params.botId),
        params.symbol,
        params.side,
        params.price.toString(),
        params.amount.toString(),
        "OPEN",
        (_a = params.createdAt) !== null && _a !== void 0 ? _a : new Date(),
    ], { prepare: true });
}
async function updateRealLiquidityOrderStatus(ecosystemOrderId, status) {
    const query = `
    UPDATE ${client_1.aiMarketMakerKeyspace}.ai_real_liquidity_orders
    SET status = ?
    WHERE ecosystem_order_id = ?
  `;
    await client_1.default.execute(query, [status, cassandra_driver_1.types.Uuid.fromString(ecosystemOrderId)], { prepare: true });
    if (status === "FILLED" || status === "CANCELLED") {
        await retireRealLiquidityOrder(ecosystemOrderId);
    }
}
const RETIRED_ORDER_TTL_SECONDS = 30 * 24 * 60 * 60;
async function retireRealLiquidityOrder(ecosystemOrderId) {
    var _a;
    var _b;
    try {
        const id = cassandra_driver_1.types.Uuid.fromString(ecosystemOrderId);
        const existing = await client_1.default.execute(`SELECT ai_order_id, ecosystem_order_id, bot_id, market_id, symbol, side,
              price, amount, filled_amount, status, created_at, updated_at
         FROM ${client_1.aiMarketMakerKeyspace}.ai_real_liquidity_orders
        WHERE ecosystem_order_id = ?`, [id], { prepare: true });
        const row = (_a = existing.rows) === null || _a === void 0 ? void 0 : _a[0];
        if (!row)
            return;
        await client_1.default.execute(`INSERT INTO ${client_1.aiMarketMakerKeyspace}.ai_real_liquidity_orders (
         ai_order_id, ecosystem_order_id, bot_id, market_id, symbol, side,
         price, amount, filled_amount, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) USING TTL ${RETIRED_ORDER_TTL_SECONDS}`, [
            row.ai_order_id,
            row.ecosystem_order_id,
            row.bot_id,
            row.market_id,
            row.symbol,
            row.side,
            row.price,
            row.amount,
            row.filled_amount,
            row.status,
            row.created_at,
            (_b = row.updated_at) !== null && _b !== void 0 ? _b : new Date(),
        ], { prepare: true });
    }
    catch (error) {
        console_1.logger.debug("AI_MM", `Could not set a retention TTL on finished order ${ecosystemOrderId}`, error);
    }
}
async function recordRealLiquidityFill(params) {
    try {
        const status = (0, real_liquidity_status_1.statusAfterFill)(params.remainingAmount);
        const now = new Date();
        if (status) {
            await client_1.default.execute(`UPDATE ${client_1.aiMarketMakerKeyspace}.ai_real_liquidity_orders
         SET filled_amount = ?, status = ?, updated_at = ?
         WHERE ecosystem_order_id = ?`, [
                params.filledAmount.toString(),
                status,
                now,
                cassandra_driver_1.types.Uuid.fromString(params.ecosystemOrderId),
            ], { prepare: true });
        }
        else {
            await client_1.default.execute(`UPDATE ${client_1.aiMarketMakerKeyspace}.ai_real_liquidity_orders
         SET filled_amount = ?, updated_at = ?
         WHERE ecosystem_order_id = ?`, [
                params.filledAmount.toString(),
                now,
                cassandra_driver_1.types.Uuid.fromString(params.ecosystemOrderId),
            ], { prepare: true });
        }
    }
    catch (error) {
        console_1.logger.debug("AI_MM", `Failed to record fill on tracked bot order ${params.ecosystemOrderId}`, error);
    }
}
const orderbookUpdateLocks = new Map();
async function syncOrderbookFromAiTrade(symbol, price, amount, _side, venue = "ECO") {
    const lockKey = `${venue}:${symbol}`;
    const existingLock = orderbookUpdateLocks.get(lockKey);
    if (existingLock) {
        try {
            await existingLock;
        }
        catch (_a) {
        }
    }
    const updatePromise = syncOrderbookFromAiTradeInternal(symbol, price, amount, venue);
    orderbookUpdateLocks.set(lockKey, updatePromise);
    try {
        await updatePromise;
    }
    finally {
        if (orderbookUpdateLocks.get(lockKey) === updatePromise) {
            orderbookUpdateLocks.delete(lockKey);
        }
    }
}
async function syncOrderbookFromAiTradeInternal(symbol, price, amount, venue = "ECO") {
    const keyspace = (0, adapter_1.venueKeyspace)(venue);
    const spreadLevels = [0.001, 0.002, 0.003, 0.004, 0.005];
    const bidEntries = [];
    const askEntries = [];
    for (const spread of spreadLevels) {
        const bidPrice = price * (1 - spread);
        const bidAmount = amount * (0.5 + Math.random() * 1.0);
        bidEntries.push({ price: bidPrice, amount: bidAmount });
        const askPrice = price * (1 + spread);
        const askAmount = amount * (0.5 + Math.random() * 1.0);
        askEntries.push({ price: askPrice, amount: askAmount });
    }
    const batchQueries = [];
    const sides = ["BIDS", "ASKS"];
    for (const side of sides) {
        const selectQuery = `
      SELECT price, TTL(amount) AS ttl FROM ${keyspace}.orderbook
      WHERE symbol = ? AND side = ?
    `;
        try {
            const result = await client_1.default.execute(selectQuery, [symbol, side], { prepare: true });
            for (const row of result.rows) {
                const ttl = row.ttl;
                if (ttl === null || ttl === undefined)
                    continue;
                batchQueries.push({
                    query: `DELETE FROM ${keyspace}.orderbook WHERE symbol = ? AND side = ? AND price = ?`,
                    params: [symbol, side, row.price],
                });
            }
        }
        catch (error) {
            console_1.logger.error("AI_MM", `Failed to get orderbook entries for ${symbol} ${side}: ${error}`);
        }
    }
    for (const bid of bidEntries) {
        batchQueries.push({
            query: `INSERT INTO ${keyspace}.orderbook (symbol, price, amount, side) VALUES (?, ?, ?, ?) USING TTL ${exports.AI_LEVEL_TTL_SECONDS}`,
            params: [symbol, bid.price, bid.amount, "BIDS"],
        });
    }
    for (const ask of askEntries) {
        batchQueries.push({
            query: `INSERT INTO ${keyspace}.orderbook (symbol, price, amount, side) VALUES (?, ?, ?, ?) USING TTL ${exports.AI_LEVEL_TTL_SECONDS}`,
            params: [symbol, ask.price, ask.amount, "ASKS"],
        });
    }
    if (batchQueries.length > 0) {
        try {
            await client_1.default.batch(batchQueries, { prepare: true });
        }
        catch (error) {
            console_1.logger.error("AI_MM", `Failed to update orderbook batch for ${symbol}: ${error}`);
            console_1.logger.warn("AI_MM", `Falling back to individual orderbook updates for ${symbol}`);
            await clearOrderbookForSymbol(symbol, venue);
            for (const bid of bidEntries) {
                try {
                    await (0, adapter_1.venueAdapter)(venue).writeLevel(symbol, bid.price, bid.amount, "BIDS", exports.AI_LEVEL_TTL_SECONDS);
                }
                catch (e) {
                    console_1.logger.error("AI_MM", `Failed to insert bid: ${e}`);
                }
            }
            for (const ask of askEntries) {
                try {
                    await (0, adapter_1.venueAdapter)(venue).writeLevel(symbol, ask.price, ask.amount, "ASKS", exports.AI_LEVEL_TTL_SECONDS);
                }
                catch (e) {
                    console_1.logger.error("AI_MM", `Failed to insert ask: ${e}`);
                }
            }
        }
    }
    await invalidateVenueOrderbook(symbol, venue);
}
async function syncTradeToEcosystem(symbol, price, amount, side, venue = "ECO") {
    const adapter = (0, adapter_1.venueAdapter)(venue);
    if (!adapter.hasTradeFeed)
        return;
    await adapter.insertTrade(symbol, price, amount, side);
}
async function clearCandlesForSymbol(symbol, venue = "ECO") {
    const keyspace = (0, adapter_1.venueKeyspace)(venue);
    const intervals = [
        "1m", "3m", "5m", "15m", "30m",
        "1h", "2h", "4h", "6h", "12h",
        "1d", "3d", "1w"
    ];
    for (const interval of intervals) {
        try {
            const query = `
        SELECT "createdAt" FROM ${keyspace}.candles
        WHERE symbol = ? AND interval = ?
      `;
            const result = await client_1.default.execute(query, [symbol, interval], { prepare: true });
            for (const row of result.rows) {
                const deleteQuery = `
          DELETE FROM ${keyspace}.candles
          WHERE symbol = ? AND interval = ? AND "createdAt" = ?
        `;
                await client_1.default.execute(deleteQuery, [symbol, interval, row.createdAt], { prepare: true });
            }
            if (result.rows.length > 0) {
                console_1.logger.debug("AI_MM", `Cleared ${result.rows.length} ${interval} candles for ${symbol}`);
            }
        }
        catch (error) {
            console_1.logger.error("AI_MM", `Failed to clear ${interval} candles for ${symbol}: ${error}`);
        }
    }
}
async function clearOrderbookForSymbol(symbol, venue = "ECO") {
    const keyspace = (0, adapter_1.venueKeyspace)(venue);
    const sides = ["BIDS", "ASKS"];
    let totalCleared = 0;
    for (const side of sides) {
        const query = `
      SELECT price, TTL(amount) AS ttl FROM ${keyspace}.orderbook
      WHERE symbol = ? AND side = ?
    `;
        try {
            const result = await client_1.default.execute(query, [symbol, side], { prepare: true });
            for (const row of result.rows) {
                const ttl = row.ttl;
                if (ttl === null || ttl === undefined)
                    continue;
                const deleteQuery = `
          DELETE FROM ${keyspace}.orderbook
          WHERE symbol = ? AND side = ? AND price = ?
        `;
                await client_1.default.execute(deleteQuery, [symbol, side, row.price], { prepare: true });
                totalCleared++;
            }
            console_1.logger.debug("AI_MM", `Cleared ${totalCleared} AI ${side} orderbook entries for ${symbol}`);
        }
        catch (error) {
            console_1.logger.error("AI_MM", `Failed to clear orderbook for ${symbol} ${side}: ${error}`);
        }
    }
    console_1.logger.debug("AI_MM", `Total cleared: ${totalCleared} orderbook entries for ${symbol}`);
    await invalidateVenueOrderbook(symbol, venue);
}
async function forceCleanOrderbook(symbol, venue = "ECO") {
    var _a;
    const keyspace = (0, adapter_1.venueKeyspace)(venue);
    let totalCleared = 0;
    try {
        const query = `
      SELECT symbol, side, price FROM ${keyspace}.orderbook_by_symbol
      WHERE symbol = ?
    `;
        const result = await client_1.default.execute(query, [symbol], { prepare: true });
        console_1.logger.debug("AI_MM", `Found ${result.rows.length} total orderbook entries to clear for ${symbol}`);
        let skippedRealLevels = 0;
        for (const row of result.rows) {
            try {
                const provenance = await client_1.default.execute(`SELECT TTL(amount) AS ttl FROM ${keyspace}.orderbook
           WHERE symbol = ? AND side = ? AND price = ?`, [row.symbol, row.side, row.price], { prepare: true });
                const ttl = (_a = provenance.rows[0]) === null || _a === void 0 ? void 0 : _a.ttl;
                if (ttl === null || ttl === undefined) {
                    skippedRealLevels++;
                    continue;
                }
                const deleteQuery = `
          DELETE FROM ${keyspace}.orderbook
          WHERE symbol = ? AND side = ? AND price = ?
        `;
                await client_1.default.execute(deleteQuery, [row.symbol, row.side, row.price], { prepare: true });
                totalCleared++;
            }
            catch (deleteErr) {
                console_1.logger.error("AI_MM", `Failed to delete entry: ${deleteErr}`);
            }
        }
        console_1.logger.debug("AI_MM", `Force cleared ${totalCleared} AI orderbook entries for ${symbol} ` +
            `(left ${skippedRealLevels} order-backed level(s) alone)`);
        await invalidateVenueOrderbook(symbol, venue);
        return totalCleared;
    }
    catch (error) {
        console_1.logger.error("AI_MM", `Force clean orderbook failed for ${symbol}: ${error}`);
        await clearOrderbookForSymbol(symbol);
        return -1;
    }
}
async function getLastCandleClosePrice(symbol, venue = "ECO") {
    const keyspace = (0, adapter_1.venueKeyspace)(venue);
    try {
        const query = `
      SELECT close FROM ${keyspace}.candles
      WHERE symbol = ? AND interval = '1m'
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;
        const result = await client_1.default.execute(query, [symbol], { prepare: true });
        if (result.rows.length > 0 && result.rows[0].close != null) {
            return result.rows[0].close;
        }
        return null;
    }
    catch (error) {
        console_1.logger.error("AI_MM", `Failed to get last candle price for ${symbol}: ${error}`);
        return null;
    }
}
const intervalDurations = {
    "1m": 60 * 1000,
    "3m": 3 * 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "30m": 30 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "2h": 2 * 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "12h": 12 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "3d": 3 * 24 * 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
};
function normalizeToIntervalBoundary(timestamp, interval) {
    const date = new Date(timestamp);
    switch (interval) {
        case "1w":
            const dayOfWeek = date.getUTCDay();
            date.setUTCDate(date.getUTCDate() - dayOfWeek);
            date.setUTCHours(0, 0, 0, 0);
            break;
        case "3d":
            const epochDays3 = Math.floor(date.getTime() / (3 * 24 * 60 * 60 * 1000));
            return epochDays3 * 3 * 24 * 60 * 60 * 1000;
        case "1d":
            date.setUTCHours(0, 0, 0, 0);
            break;
        case "12h":
            const hour12 = Math.floor(date.getUTCHours() / 12) * 12;
            date.setUTCHours(hour12, 0, 0, 0);
            break;
        case "6h":
            const hour6 = Math.floor(date.getUTCHours() / 6) * 6;
            date.setUTCHours(hour6, 0, 0, 0);
            break;
        case "4h":
            const hour4 = Math.floor(date.getUTCHours() / 4) * 4;
            date.setUTCHours(hour4, 0, 0, 0);
            break;
        case "2h":
            const hour2 = Math.floor(date.getUTCHours() / 2) * 2;
            date.setUTCHours(hour2, 0, 0, 0);
            break;
        case "1h":
            date.setUTCMinutes(0, 0, 0);
            break;
        case "30m":
            const min30 = Math.floor(date.getUTCMinutes() / 30) * 30;
            date.setUTCMinutes(min30, 0, 0);
            break;
        case "15m":
            const min15 = Math.floor(date.getUTCMinutes() / 15) * 15;
            date.setUTCMinutes(min15, 0, 0);
            break;
        case "5m":
            const min5 = Math.floor(date.getUTCMinutes() / 5) * 5;
            date.setUTCMinutes(min5, 0, 0);
            break;
        case "3m":
            const min3 = Math.floor(date.getUTCMinutes() / 3) * 3;
            date.setUTCMinutes(min3, 0, 0);
            break;
        case "1m":
            date.setUTCSeconds(0, 0);
            break;
        default:
            date.setUTCMilliseconds(0);
    }
    return date.getTime();
}
async function syncCandlesFromAiTrade(symbol, price, volume, options) {
    var _a;
    const keyspace = (0, adapter_1.venueKeyspace)((_a = options === null || options === void 0 ? void 0 : options.venue) !== null && _a !== void 0 ? _a : "ECO");
    const intervals = [
        "1m", "3m", "5m", "15m", "30m",
        "1h", "2h", "4h", "6h", "12h",
        "1d", "3d", "1w"
    ];
    const now = new Date();
    let pinnedClose = null;
    if (options === null || options === void 0 ? void 0 : options.authoritativeClose) {
        await (0, closeAuthority_1.claimSettlementClose)(symbol, price, now.getTime());
    }
    else {
        pinnedClose = await (0, closeAuthority_1.getSettlementClose)(symbol, now.getTime());
        if (pinnedClose !== null && pinnedClose !== price) {
            console_1.logger.debug("AI_MM", `${symbol}: close pinned to published settlement price ${pinnedClose} ` +
                `(tick price ${price}) for this minute`);
        }
    }
    await Promise.all(intervals.map(async (interval) => {
        try {
            const candleTimestamp = normalizeToIntervalBoundary(now.getTime(), interval);
            const candleTime = new Date(candleTimestamp);
            const closePrice = interval === "1m" && pinnedClose !== null ? pinnedClose : price;
            const checkQuery = `
        SELECT open, high, low, close, volume FROM ${keyspace}.candles
        WHERE symbol = ? AND interval = ? AND "createdAt" = ?
      `;
            const existingResult = await client_1.default.execute(checkQuery, [symbol, interval, candleTime], { prepare: true });
            if (existingResult.rows.length > 0) {
                const existing = existingResult.rows[0];
                const newHigh = Math.max(existing.high, price, closePrice);
                const newLow = Math.min(existing.low, price, closePrice);
                const newVolume = (existing.volume || 0) + volume;
                const updateQuery = `
          UPDATE ${keyspace}.candles
          SET high = ?, low = ?, close = ?, volume = ?, "updatedAt" = ?
          WHERE symbol = ? AND interval = ? AND "createdAt" = ?
        `;
                await client_1.default.execute(updateQuery, [newHigh, newLow, closePrice, newVolume, now, symbol, interval, candleTime], { prepare: true });
            }
            else {
                const prevCandleTime = getPreviousCandleTime(candleTime, interval);
                const prevQuery = `
          SELECT close FROM ${keyspace}.candles
          WHERE symbol = ? AND interval = ? AND "createdAt" = ?
        `;
                const prevResult = await client_1.default.execute(prevQuery, [symbol, interval, prevCandleTime], { prepare: true });
                const openPrice = prevResult.rows.length > 0 ? prevResult.rows[0].close : closePrice;
                const insertQuery = `
          INSERT INTO ${keyspace}.candles (
            symbol, interval, "createdAt", "updatedAt", open, high, low, close, volume
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
                await client_1.default.execute(insertQuery, [
                    symbol,
                    interval,
                    candleTime,
                    now,
                    openPrice,
                    Math.max(openPrice, price, closePrice),
                    Math.min(openPrice, price, closePrice),
                    closePrice,
                    volume
                ], { prepare: true });
            }
        }
        catch (error) {
            console_1.logger.error("AI_MM", `Failed to sync candle for ${symbol} ${interval}: ${error}`);
        }
    }));
}
function getPreviousCandleTime(currentTime, interval) {
    const duration = intervalDurations[interval] || intervalDurations["1m"];
    return new Date(currentTime.getTime() - duration);
}
function getCandleTime(date, interval) {
    return new Date(normalizeToIntervalBoundary(date.getTime(), interval));
}
async function getRealLiquidityOrdersBySymbol(symbol, status) {
    let query = `
    SELECT * FROM ${client_1.aiMarketMakerKeyspace}.ai_real_liquidity_orders
    WHERE symbol = ?
  `;
    const params = [symbol];
    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }
    query += ` ALLOW FILTERING`;
    const result = await client_1.default.execute(query, params, { prepare: true });
    return result.rows.map((row) => { var _a, _b, _c, _d; return ({
        id: (_a = row.ai_order_id) === null || _a === void 0 ? void 0 : _a.toString(),
        aiBotOrderId: (_b = row.ai_order_id) === null || _b === void 0 ? void 0 : _b.toString(),
        ecosystemOrderId: (_c = row.ecosystem_order_id) === null || _c === void 0 ? void 0 : _c.toString(),
        botId: (_d = row.bot_id) === null || _d === void 0 ? void 0 : _d.toString(),
        symbol: row.symbol,
        side: row.side,
        price: toBigIntSafe(row.price),
        amount: toBigIntSafe(row.amount),
        filledAmount: toBigIntSafe(row.filled_amount),
        status: row.status,
        createdAt: row.created_at,
    }); });
}
function calculateLiquiditySplit(totalAmount, realLiquidityPercent) {
    const percent = Math.max(0, Math.min(100, realLiquidityPercent));
    const realAmount = (totalAmount * BigInt(Math.round(percent * 100))) / BigInt(10000);
    const aiAmount = totalAmount - realAmount;
    return { aiAmount, realAmount };
}
async function getBotTradeStats(marketId) {
    var _a, _b;
    const statsMap = new Map();
    try {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(new cassandra_driver_1.types.LocalDate(date.getFullYear(), date.getMonth() + 1, date.getDate()));
        }
        const query = `
      SELECT buy_bot_id, sell_bot_id, price, amount
      FROM ${client_1.aiMarketMakerKeyspace}.ai_bot_trades
      WHERE market_id = ? AND trade_date = ?
    `;
        const settled = await Promise.allSettled(dates.map((tradeDate) => client_1.default.execute(query, [cassandra_driver_1.types.Uuid.fromString(marketId), tradeDate], { prepare: true })));
        for (const outcome of settled) {
            if (outcome.status === "rejected") {
                console_1.logger.error("AI_MM", `Failed to read one day partition of bot trade stats for market ${marketId}: ${outcome.reason}`);
                continue;
            }
            const result = outcome.value;
            for (const row of result.rows) {
                const buyBotId = (_a = row.buy_bot_id) === null || _a === void 0 ? void 0 : _a.toString();
                if (buyBotId) {
                    const existing = statsMap.get(buyBotId) || { tradeCount: 0, totalVolume: 0 };
                    existing.tradeCount++;
                    existing.totalVolume += Number(toBigIntSafe(row.amount)) / 1e18;
                    statsMap.set(buyBotId, existing);
                }
                const sellBotId = (_b = row.sell_bot_id) === null || _b === void 0 ? void 0 : _b.toString();
                if (sellBotId) {
                    const existing = statsMap.get(sellBotId) || { tradeCount: 0, totalVolume: 0 };
                    existing.tradeCount++;
                    existing.totalVolume += Number(toBigIntSafe(row.amount)) / 1e18;
                    statsMap.set(sellBotId, existing);
                }
            }
        }
    }
    catch (error) {
        console_1.logger.error("AI_MM", `Failed to get bot trade stats for market ${marketId}: ${error}`);
    }
    return statsMap;
}
async function debugGetAllTrades(limit = 50) {
    try {
        const query = `
      SELECT market_id, trade_date, trade_time, buy_bot_id, sell_bot_id, price, amount
      FROM ${client_1.aiMarketMakerKeyspace}.ai_bot_trades
      LIMIT ?
      ALLOW FILTERING
    `;
        const result = await client_1.default.execute(query, [limit], { prepare: true });
        return result.rows.map((row) => { var _a, _b, _c, _d, _e, _f; return ({
            marketId: (_a = row.market_id) === null || _a === void 0 ? void 0 : _a.toString(),
            tradeDate: (_b = row.trade_date) === null || _b === void 0 ? void 0 : _b.toString(),
            tradeTime: row.trade_time,
            buyBotId: (_c = row.buy_bot_id) === null || _c === void 0 ? void 0 : _c.toString(),
            sellBotId: (_d = row.sell_bot_id) === null || _d === void 0 ? void 0 : _d.toString(),
            price: (_e = row.price) === null || _e === void 0 ? void 0 : _e.toString(),
            amount: (_f = row.amount) === null || _f === void 0 ? void 0 : _f.toString(),
        }); });
    }
    catch (error) {
        console_1.logger.error("AI_MM", `DEBUG: Failed to get all trades: ${error}`);
        return [];
    }
}
async function getRecentBotTrades(marketId, limit = 20) {
    var _a, _b, _c;
    const trades = [];
    try {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(new cassandra_driver_1.types.LocalDate(date.getFullYear(), date.getMonth() + 1, date.getDate()));
        }
        for (const tradeDate of dates) {
            if (trades.length >= limit)
                break;
            const query = `
        SELECT trade_id, trade_time, buy_bot_id, sell_bot_id, price, amount
        FROM ${client_1.aiMarketMakerKeyspace}.ai_bot_trades
        WHERE market_id = ? AND trade_date = ?
        ORDER BY trade_time DESC
        LIMIT ?
      `;
            const result = await client_1.default.execute(query, [cassandra_driver_1.types.Uuid.fromString(marketId), tradeDate, limit - trades.length], { prepare: true });
            for (const row of result.rows) {
                trades.push({
                    id: ((_a = row.trade_id) === null || _a === void 0 ? void 0 : _a.toString()) || "",
                    price: (Number(toBigIntSafe(row.price)) / 1e18).toFixed(8),
                    amount: (Number(toBigIntSafe(row.amount)) / 1e18).toFixed(8),
                    buyBotId: ((_b = row.buy_bot_id) === null || _b === void 0 ? void 0 : _b.toString()) || "",
                    sellBotId: ((_c = row.sell_bot_id) === null || _c === void 0 ? void 0 : _c.toString()) || "",
                    createdAt: row.trade_time,
                });
            }
        }
        trades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return trades.slice(0, limit);
    }
    catch (error) {
        console_1.logger.error("AI_MM", `Failed to get recent bot trades for market ${marketId}: ${error}`);
        return [];
    }
}
async function getMarketTradeStats(marketId) {
    let tradeCount = 0;
    let totalVolume = 0;
    try {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(new cassandra_driver_1.types.LocalDate(date.getFullYear(), date.getMonth() + 1, date.getDate()));
        }
        for (const tradeDate of dates) {
            const query = `
        SELECT price, amount
        FROM ${client_1.aiMarketMakerKeyspace}.ai_bot_trades
        WHERE market_id = ? AND trade_date = ?
      `;
            const result = await client_1.default.execute(query, [cassandra_driver_1.types.Uuid.fromString(marketId), tradeDate], { prepare: true });
            for (const row of result.rows) {
                tradeCount++;
                totalVolume += Number(toBigIntSafe(row.amount)) / 1e18;
            }
        }
    }
    catch (error) {
        console_1.logger.error("AI_MM", `Failed to get market trade stats for ${marketId}: ${error}`);
    }
    return { tradeCount, totalVolume };
}
async function deleteAiBotOrdersByMarket(marketId) {
    let deletedCount = 0;
    try {
        const selectQuery = `
      SELECT order_id, created_at FROM ${client_1.aiMarketMakerKeyspace}.ai_bot_orders
      WHERE market_id = ?
    `;
        const result = await client_1.default.execute(selectQuery, [cassandra_driver_1.types.Uuid.fromString(marketId)], { prepare: true });
        for (const row of result.rows) {
            const deleteQuery = `
        DELETE FROM ${client_1.aiMarketMakerKeyspace}.ai_bot_orders
        WHERE market_id = ? AND created_at = ? AND order_id = ?
      `;
            await client_1.default.execute(deleteQuery, [cassandra_driver_1.types.Uuid.fromString(marketId), row.created_at, row.order_id], { prepare: true });
            deletedCount++;
        }
        console_1.logger.info("AI_MM", `Cleanup: Deleted ${deletedCount} bot orders for market ${marketId}`);
    }
    catch (error) {
        console_1.logger.error("AI_MM", `Cleanup: Failed to delete bot orders for market ${marketId}: ${error}`);
    }
    return deletedCount;
}
async function deleteAiBotTradesByMarket(marketId) {
    let deletedCount = 0;
    try {
        const dates = [];
        for (let i = 0; i < 365; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(new cassandra_driver_1.types.LocalDate(date.getFullYear(), date.getMonth() + 1, date.getDate()));
        }
        for (const tradeDate of dates) {
            const selectQuery = `
        SELECT trade_time, trade_id FROM ${client_1.aiMarketMakerKeyspace}.ai_bot_trades
        WHERE market_id = ? AND trade_date = ?
      `;
            const result = await client_1.default.execute(selectQuery, [cassandra_driver_1.types.Uuid.fromString(marketId), tradeDate], { prepare: true });
            for (const row of result.rows) {
                const deleteQuery = `
          DELETE FROM ${client_1.aiMarketMakerKeyspace}.ai_bot_trades
          WHERE market_id = ? AND trade_date = ? AND trade_time = ? AND trade_id = ?
        `;
                await client_1.default.execute(deleteQuery, [cassandra_driver_1.types.Uuid.fromString(marketId), tradeDate, row.trade_time, row.trade_id], { prepare: true });
                deletedCount++;
            }
        }
        console_1.logger.info("AI_MM", `Cleanup: Deleted ${deletedCount} bot trades for market ${marketId}`);
    }
    catch (error) {
        console_1.logger.error("AI_MM", `Cleanup: Failed to delete bot trades for market ${marketId}: ${error}`);
    }
    return deletedCount;
}
async function deleteAiPriceHistoryByMarket(marketId) {
    let deletedCount = 0;
    try {
        const selectQuery = `
      SELECT timestamp FROM ${client_1.aiMarketMakerKeyspace}.ai_price_history
      WHERE market_id = ?
    `;
        const result = await client_1.default.execute(selectQuery, [cassandra_driver_1.types.Uuid.fromString(marketId)], { prepare: true });
        for (const row of result.rows) {
            const deleteQuery = `
        DELETE FROM ${client_1.aiMarketMakerKeyspace}.ai_price_history
        WHERE market_id = ? AND timestamp = ?
      `;
            await client_1.default.execute(deleteQuery, [cassandra_driver_1.types.Uuid.fromString(marketId), row.timestamp], { prepare: true });
            deletedCount++;
        }
        console_1.logger.info("AI_MM", `Cleanup: Deleted ${deletedCount} price history entries for market ${marketId}`);
    }
    catch (error) {
        console_1.logger.error("AI_MM", `Cleanup: Failed to delete price history for market ${marketId}: ${error}`);
    }
    return deletedCount;
}
async function deleteRealLiquidityOrdersBySymbol(symbol) {
    let deletedCount = 0;
    try {
        const selectQuery = `
      SELECT ai_order_id, ecosystem_order_id FROM ${client_1.aiMarketMakerKeyspace}.ai_real_liquidity_orders
      WHERE symbol = ?
      ALLOW FILTERING
    `;
        const result = await client_1.default.execute(selectQuery, [symbol], { prepare: true });
        for (const row of result.rows) {
            const deleteQuery = `
        DELETE FROM ${client_1.aiMarketMakerKeyspace}.ai_real_liquidity_orders
        WHERE ecosystem_order_id = ?
      `;
            await client_1.default.execute(deleteQuery, [row.ecosystem_order_id], { prepare: true });
            deletedCount++;
        }
        console_1.logger.info("AI_MM", `Cleanup: Deleted ${deletedCount} real liquidity order records for ${symbol}`);
    }
    catch (error) {
        console_1.logger.error("AI_MM", `Cleanup: Failed to delete real liquidity orders for ${symbol}: ${error}`);
    }
    return deletedCount;
}
async function getOpenBotEcosystemOrderIds(symbol) {
    const orderIds = [];
    try {
        const query = `
      SELECT ecosystem_order_id FROM ${client_1.aiMarketMakerKeyspace}.ai_real_liquidity_orders
      WHERE symbol = ? AND status = 'OPEN'
      ALLOW FILTERING
    `;
        const result = await client_1.default.execute(query, [symbol], { prepare: true });
        for (const row of result.rows) {
            if (row.ecosystem_order_id) {
                orderIds.push(row.ecosystem_order_id.toString());
            }
        }
        console_1.logger.info("AI_MM", `Cleanup: Found ${orderIds.length} open bot orders for ${symbol}`);
    }
    catch (error) {
        console_1.logger.error("AI_MM", `Cleanup: Failed to get open bot orders for ${symbol}: ${error}`);
    }
    return orderIds;
}
async function evictFromMatcherQueue(orderId, symbol) {
    var _a, _b;
    try {
        const mod = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/matchingEngine")));
        const engine = await ((_b = (_a = mod.MatchingEngine) === null || _a === void 0 ? void 0 : _a.getInstance) === null || _b === void 0 ? void 0 : _b.call(_a));
        await (engine === null || engine === void 0 ? void 0 : engine.handleOrderCancellation(orderId, symbol));
    }
    catch (error) {
        console_1.logger.debug("AI_MM", `Queue eviction for cancelled order ${orderId} on ${symbol} skipped`, error);
    }
}
async function cancelOpenBotEcosystemOrders(symbol) {
    var _a, _b, _c;
    const failed = [];
    let cancelled = 0;
    let rows = [];
    try {
        rows = await getRealLiquidityOrdersBySymbol(symbol, "OPEN");
    }
    catch (error) {
        console_1.logger.error("AI_MM", `Cleanup: could not list open bot orders for ${symbol}: ${error}`);
        return { found: 0, cancelled: 0, failed };
    }
    if (!rows.length)
        return { found: 0, cancelled: 0, failed };
    for (const row of rows) {
        const orderId = row.ecosystemOrderId;
        try {
            if (!row.botId) {
                failed.push({
                    orderId,
                    error: "tracking row has no botId; cannot reconstruct the partition key",
                });
                continue;
            }
            const live = await (0, queries_1.getOrderByUserAndId)(row.botId, orderId);
            if (!live || live.status !== "OPEN") {
                await updateRealLiquidityOrderStatus(orderId, (live === null || live === void 0 ? void 0 : live.status) === "CLOSED" ? "FILLED" : "CANCELLED");
                continue;
            }
            const remaining = toBigIntSafe((_a = live.remaining) !== null && _a !== void 0 ? _a : row.amount);
            if (remaining <= BigInt(0)) {
                await updateRealLiquidityOrderStatus(orderId, "CANCELLED");
                continue;
            }
            const ok = await cancelRealOrder(orderId, row.botId, new Date((_b = live.createdAt) !== null && _b !== void 0 ? _b : row.createdAt).toISOString(), symbol, toBigIntSafe((_c = live.price) !== null && _c !== void 0 ? _c : row.price), row.side, remaining);
            if (ok) {
                cancelled++;
                await evictFromMatcherQueue(orderId, symbol);
            }
            else {
                failed.push({ orderId, error: "cancel found no matching order row" });
            }
        }
        catch (error) {
            failed.push({ orderId, error: (error === null || error === void 0 ? void 0 : error.message) || String(error) });
        }
    }
    console_1.logger.info("AI_MM", `Cleanup: cancelled ${cancelled}/${rows.length} open bot orders for ${symbol}` +
        (failed.length ? ` (${failed.length} still resting)` : ""));
    return { found: rows.length, cancelled, failed };
}
async function cleanupMarketMakerData(marketId, symbol, venue = "ECO") {
    console_1.logger.info("AI_MM", `Cleanup: Starting cleanup for market ${marketId} (${symbol})`);
    const ordersDeleted = await deleteAiBotOrdersByMarket(marketId);
    const tradesDeleted = await deleteAiBotTradesByMarket(marketId);
    const priceHistoryDeleted = await deleteAiPriceHistoryByMarket(marketId);
    const realLiquidityOrdersDeleted = venue === "FUTURES" ? 0 : await deleteRealLiquidityOrdersBySymbol(symbol);
    const orderbookEntriesCleared = await forceCleanOrderbook(symbol, venue);
    console_1.logger.info("AI_MM", `Cleanup: Completed cleanup for ${symbol}: orders=${ordersDeleted}, trades=${tradesDeleted}, priceHistory=${priceHistoryDeleted}, realLiquidityOrders=${realLiquidityOrdersDeleted}, orderbookEntries=${orderbookEntriesCleared}`);
    return {
        ordersDeleted,
        tradesDeleted,
        priceHistoryDeleted,
        realLiquidityOrdersDeleted,
        orderbookEntriesCleared,
    };
}
