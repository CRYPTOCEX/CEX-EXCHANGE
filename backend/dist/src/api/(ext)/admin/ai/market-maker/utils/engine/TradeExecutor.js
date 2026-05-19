"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeExecutor = void 0;
const console_1 = require("@b/utils/console");
const queries_1 = require("../scylla/queries");
const db_1 = require("@b/db");
const index_ws_1 = require("../../market/index.ws");
const uuid_1 = require("uuid");
class TradeExecutor {
    constructor(config, orderManager) {
        this.aiTradesExecuted = 0;
        this.realOrdersPlaced = 0;
        this.totalVolume = BigInt(0);
        this.config = config;
        this.orderManager = orderManager;
    }
    async executeAiTrade(params) {
        try {
            const activeBots = this.config.bots.filter((b) => b.status === "ACTIVE");
            if (activeBots.length < 2) {
                console_1.logger.warn("AI_MM", `Need at least 2 active bots for AI trades on ${this.config.symbol}`);
                return false;
            }
            const [buyBot, sellBot] = this.selectTradingBots(activeBots, params.direction);
            if (!buyBot || !sellBot) {
                console_1.logger.warn("AI_MM", `Cannot execute AI trade for ${this.config.symbol}: ` +
                    `insufficient bots available (buyBot: ${buyBot ? 'available' : 'null'}, sellBot: ${sellBot ? 'available' : 'null'})`);
                return false;
            }
            if (buyBot.id === sellBot.id) {
                console_1.logger.warn("AI_MM", "Cannot execute AI trade: same bot selected for both sides");
                return false;
            }
            const tradePriceNum = params.targetPrice;
            const tradePrice = BigInt(Math.floor(tradePriceNum * 1e18));
            const tradeAmountNum = Number(params.amount) / 1e18;
            const buyOrderId = (0, uuid_1.v4)();
            const sellOrderId = (0, uuid_1.v4)();
            await (0, queries_1.insertBotTrade)({
                marketId: this.config.marketId,
                buyBotId: buyBot.id,
                sellBotId: sellBot.id,
                buyOrderId,
                sellOrderId,
                price: tradePrice,
                amount: params.amount,
            });
            await (0, queries_1.syncOrderbookFromAiTrade)(this.config.symbol, tradePriceNum, tradeAmountNum, params.direction);
            await (0, queries_1.syncCandlesFromAiTrade)(this.config.symbol, tradePriceNum, tradeAmountNum);
            await (0, queries_1.syncTradeToEcosystem)(this.config.symbol, tradePriceNum, tradeAmountNum, params.direction);
            this.aiTradesExecuted++;
            this.totalVolume += params.amount;
            await this.updateDatabaseStats(buyBot.id, sellBot.id, tradeAmountNum, tradePriceNum);
            console_1.logger.debug("AI_MM", `AI trade executed: ${this.config.symbol} ` +
                `${params.direction} ${tradeAmountNum.toFixed(4)} @ ${tradePriceNum.toFixed(8)} ` +
                `| Buyer: ${buyBot.name} | Seller: ${sellBot.name}`);
            if (process.env.NODE_ENV === "development") {
                console_1.logger.debug("AI_MM", `Broadcasting TRADE event for market ${this.config.id}`);
            }
            (0, index_ws_1.broadcastAiMarketMakerEvent)(this.config.id, {
                type: "TRADE",
                data: {
                    tradeId: buyOrderId,
                    symbol: this.config.symbol,
                    side: params.direction,
                    price: tradePriceNum,
                    amount: tradeAmountNum,
                    buyBotId: buyBot.id,
                    buyBotName: buyBot.name,
                    sellBotId: sellBot.id,
                    sellBotName: sellBot.name,
                    timestamp: new Date().toISOString(),
                },
            });
            (0, index_ws_1.broadcastBotActivity)(this.config.id, {
                botId: buyBot.id,
                botName: buyBot.name,
                action: "AI_TRADE",
                details: {
                    side: "BUY",
                    price: tradePriceNum,
                    amount: tradeAmountNum,
                    counterpartyBotId: sellBot.id,
                    counterpartyBotName: sellBot.name,
                },
            });
            (0, index_ws_1.broadcastBotActivity)(this.config.id, {
                botId: sellBot.id,
                botName: sellBot.name,
                action: "AI_TRADE",
                details: {
                    side: "SELL",
                    price: tradePriceNum,
                    amount: tradeAmountNum,
                    counterpartyBotId: buyBot.id,
                    counterpartyBotName: buyBot.name,
                },
            });
            return true;
        }
        catch (error) {
            console_1.logger.error("AI_MM", "AI trade execution error", error);
            return false;
        }
    }
    async updateDatabaseStats(buyBotId, sellBotId, tradeAmount, tradePrice) {
        var _a;
        try {
            const now = new Date();
            const tradeValue = tradeAmount * tradePrice;
            const buyBot = this.config.bots.find((b) => b.id === buyBotId);
            if (buyBot) {
                buyBot.dailyTradeCount++;
                buyBot.lastTradeAt = now;
            }
            const sellBot = this.config.bots.find((b) => b.id === sellBotId);
            if (sellBot) {
                sellBot.dailyTradeCount++;
                sellBot.lastTradeAt = now;
            }
            this.config.currentDailyVolume += tradeAmount;
            await db_1.models.aiBot.increment({ dailyTradeCount: 1, totalVolume: tradeValue }, { where: { id: buyBotId } });
            await db_1.models.aiBot.update({ lastTradeAt: now }, { where: { id: buyBotId } });
            await db_1.models.aiBot.increment({ dailyTradeCount: 1, totalVolume: tradeValue }, { where: { id: sellBotId } });
            await db_1.models.aiBot.update({ lastTradeAt: now }, { where: { id: sellBotId } });
            await db_1.models.aiMarketMaker.increment("currentDailyVolume", {
                by: tradeAmount,
                where: { id: this.config.id },
            });
            if (this.config.pool) {
                const cost = tradeAmount * tradePrice;
                const baseChange = tradeAmount;
                const quoteChange = cost;
            }
            const poolValue = ((_a = this.config.pool) === null || _a === void 0 ? void 0 : _a.totalValueLocked) || 0;
            await db_1.models.aiMarketMakerHistory.create({
                marketMakerId: this.config.id,
                action: "TRADE",
                details: {
                    botId: buyBotId,
                    side: "BUY",
                    amount: tradeAmount,
                    price: tradePrice,
                    triggeredBy: "SYSTEM",
                },
                priceAtAction: tradePrice,
                poolValueAtAction: poolValue,
            });
        }
        catch (error) {
            console_1.logger.error("AI_MM", "Stats update error", error);
        }
    }
    async placeRealLiquidityOrder(params) {
        try {
            const availableBots = this.config.bots.filter((b) => b.status === "ACTIVE" && b.dailyTradeCount < b.maxDailyTrades);
            if (availableBots.length === 0) {
                console_1.logger.debug("AI_MM", `Cannot place real order for ${this.config.symbol}: ` +
                    `no bots available (all at daily limit or inactive)`);
                return false;
            }
            const bot = availableBots[Math.floor(Math.random() * availableBots.length)];
            const spreadFactor = this.calculateDynamicSpread(params.direction, params.volatility);
            const orderPriceNum = params.targetPrice * spreadFactor;
            const orderPrice = BigInt(Math.floor(orderPriceNum * 1e18));
            const orderId = await this.orderManager.createOrder({
                botId: bot.id,
                side: params.direction,
                type: "LIMIT",
                price: orderPrice,
                amount: params.amount,
                purpose: "LIQUIDITY",
                isRealLiquidity: true,
            });
            if (!orderId) {
                return false;
            }
            this.realOrdersPlaced++;
            const orderAmountNum = Number(params.amount) / 1e18;
            console_1.logger.debug("AI_MM", `Real liquidity order placed: ${this.config.symbol} ` +
                `${params.direction} ${orderAmountNum.toFixed(4)} @ ${orderPriceNum.toFixed(8)}`);
            (0, index_ws_1.broadcastAiMarketMakerEvent)(this.config.id, {
                type: "ORDER",
                data: {
                    orderId,
                    symbol: this.config.symbol,
                    side: params.direction,
                    price: orderPriceNum,
                    amount: orderAmountNum,
                    botId: bot.id,
                    botName: bot.name,
                    orderType: "REAL_LIQUIDITY",
                    timestamp: new Date().toISOString(),
                },
            });
            (0, index_ws_1.broadcastBotActivity)(this.config.id, {
                botId: bot.id,
                botName: bot.name,
                action: "REAL_ORDER_PLACED",
                details: {
                    side: params.direction,
                    price: orderPriceNum,
                    amount: orderAmountNum,
                    reason: "Providing real liquidity to ecosystem",
                },
            });
            return true;
        }
        catch (error) {
            console_1.logger.error("AI_MM", "Real liquidity order placement error", error);
            return false;
        }
    }
    calculateDynamicSpread(direction, volatility) {
        const baseSpread = 0.001;
        const vol = volatility || 0;
        const volatilitySpread = Math.min(vol * 0.0005, 0.005);
        const totalSpread = baseSpread + volatilitySpread;
        if (direction === "BUY") {
            return 1 - totalSpread;
        }
        else {
            return 1 + totalSpread;
        }
    }
    selectTradingBots(bots, direction) {
        if (bots.length < 2) {
            return [null, null];
        }
        const availableBots = bots.filter((b) => b.dailyTradeCount < b.maxDailyTrades);
        if (availableBots.length < 2) {
            return [null, null];
        }
        const shuffled = [...availableBots].sort(() => Math.random() - 0.5);
        let buyBot = null;
        let sellBot = null;
        for (const bot of shuffled) {
            if (!buyBot && ["ACCUMULATOR", "SCALPER", "MARKET_MAKER"].includes(bot.personality)) {
                buyBot = bot;
                continue;
            }
            if (!sellBot && bot.id !== (buyBot === null || buyBot === void 0 ? void 0 : buyBot.id) && ["DISTRIBUTOR", "SWING"].includes(bot.personality)) {
                sellBot = bot;
            }
            if (buyBot && sellBot) {
                break;
            }
        }
        if (!buyBot || !sellBot) {
            for (const bot of shuffled) {
                if (!buyBot) {
                    buyBot = bot;
                }
                else if (!sellBot && bot.id !== buyBot.id) {
                    sellBot = bot;
                    break;
                }
            }
        }
        if (!buyBot || !sellBot || buyBot.id === sellBot.id) {
            return [null, null];
        }
        return [buyBot, sellBot];
    }
    determinePurpose(direction) {
        return "PRICE_PUSH";
    }
    addHumanBehavior(baseAmount, bot) {
        const variance = Math.min(bot.orderSizeVariance, 0.5);
        const randomFactor = 1 - variance + Math.random() * variance * 2;
        return BigInt(Math.floor(Number(baseAmount) * randomFactor));
    }
    getStats() {
        return {
            aiTradesExecuted: this.aiTradesExecuted,
            realOrdersPlaced: this.realOrdersPlaced,
            totalVolume: (Number(this.totalVolume) / 1e18).toFixed(8),
        };
    }
}
exports.TradeExecutor = TradeExecutor;
exports.default = TradeExecutor;
