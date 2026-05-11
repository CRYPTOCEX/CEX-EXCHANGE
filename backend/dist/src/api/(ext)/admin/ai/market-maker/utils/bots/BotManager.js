"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotManager = void 0;
const BotFactory_1 = require("./BotFactory");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
class BotManager {
    constructor() {
        this.marketGroups = new Map();
        this.orderManagers = new Map();
        this.minLoopInterval = 1000;
        this.maxConcurrentTrades = 3;
        this.factory = BotFactory_1.BotFactory.getInstance();
    }
    static getInstance() {
        if (!BotManager.instance) {
            BotManager.instance = new BotManager();
        }
        return BotManager.instance;
    }
    async initializeMarket(marketConfig, orderManager) {
        const { marketId } = marketConfig;
        if (this.marketGroups.has(marketId)) {
            console_1.logger.info("BOT_MANAGER", `Market ${marketId} already initialized`);
            return;
        }
        const bots = this.factory.createBotsForMarket(marketConfig);
        for (const bot of bots) {
            bot.setOrderManager(orderManager);
        }
        this.marketGroups.set(marketId, {
            marketId,
            bots,
            isRunning: false,
            loopInterval: null,
        });
        this.orderManagers.set(marketId, orderManager);
        console_1.logger.info("BOT_MANAGER", `Initialized ${bots.length} bots for market ${marketId}`);
    }
    async startMarket(marketId) {
        const group = this.marketGroups.get(marketId);
        if (!group) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Market ${marketId} not initialized` });
        }
        if (group.isRunning) {
            console_1.logger.info("BOT_MANAGER", `Market ${marketId} already running`);
            return;
        }
        for (const bot of group.bots) {
            await bot.start();
        }
        group.isRunning = true;
        this.startTradingLoop(marketId);
        console_1.logger.info("BOT_MANAGER", `Started ${group.bots.length} bots for market ${marketId}`);
    }
    async stopMarket(marketId) {
        const group = this.marketGroups.get(marketId);
        if (!group) {
            return;
        }
        if (group.loopInterval) {
            clearInterval(group.loopInterval);
            group.loopInterval = null;
        }
        for (const bot of group.bots) {
            await bot.stop();
        }
        group.isRunning = false;
        console_1.logger.info("BOT_MANAGER", `Stopped bots for market ${marketId}`);
    }
    async pauseMarket(marketId) {
        const group = this.marketGroups.get(marketId);
        if (!group)
            return;
        for (const bot of group.bots) {
            await bot.pause();
        }
        console_1.logger.info("BOT_MANAGER", `Paused bots for market ${marketId}`);
    }
    async resumeMarket(marketId) {
        const group = this.marketGroups.get(marketId);
        if (!group)
            return;
        for (const bot of group.bots) {
            await bot.resume();
        }
        console_1.logger.info("BOT_MANAGER", `Resumed bots for market ${marketId}`);
    }
    async removeMarket(marketId) {
        const group = this.marketGroups.get(marketId);
        if (group === null || group === void 0 ? void 0 : group.loopInterval) {
            clearInterval(group.loopInterval);
            group.loopInterval = null;
        }
        await this.stopMarket(marketId);
        if (group) {
            group.bots = [];
        }
        this.marketGroups.delete(marketId);
        this.orderManagers.delete(marketId);
        console_1.logger.info("BOT_MANAGER", `Removed market ${marketId}`);
    }
    async addBot(marketId, bot) {
        const group = this.marketGroups.get(marketId);
        if (!group) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Market ${marketId} not initialized` });
        }
        const orderManager = this.orderManagers.get(marketId);
        if (orderManager) {
            bot.setOrderManager(orderManager);
        }
        group.bots.push(bot);
        if (group.isRunning) {
            await bot.start();
        }
        console_1.logger.info("BOT_MANAGER", `Added bot ${bot.getBotId()} to market ${marketId}`);
    }
    async removeBot(marketId, botId) {
        const group = this.marketGroups.get(marketId);
        if (!group)
            return;
        const botIndex = group.bots.findIndex((b) => b.getBotId() === botId);
        if (botIndex === -1)
            return;
        const bot = group.bots[botIndex];
        await bot.stop();
        group.bots.splice(botIndex, 1);
        console_1.logger.info("BOT_MANAGER", `Removed bot ${botId} from market ${marketId}`);
    }
    getBots(marketId) {
        var _a;
        return ((_a = this.marketGroups.get(marketId)) === null || _a === void 0 ? void 0 : _a.bots) || [];
    }
    getBot(marketId, botId) {
        const group = this.marketGroups.get(marketId);
        return group === null || group === void 0 ? void 0 : group.bots.find((b) => b.getBotId() === botId);
    }
    getMarketStats(marketId) {
        const group = this.marketGroups.get(marketId);
        if (!group)
            return [];
        return group.bots.map((bot) => ({
            botId: bot.getBotId(),
            personality: bot.getPersonality(),
            status: bot.getStatus(),
            totalTrades: bot.getTotalTrades(),
            successfulTrades: bot.getSuccessfulTrades(),
            failedTrades: bot.getFailedTrades(),
            winRate: bot.getWinRate(),
            lastTradeTime: bot.getLastTradeTime(),
            pnl: bot.getPnL(),
        }));
    }
    getAggregateStats(marketId) {
        const stats = this.getMarketStats(marketId);
        const totalBots = stats.length;
        const activeBots = stats.filter((s) => s.status === "ACTIVE").length;
        const totalTrades = stats.reduce((sum, s) => sum + s.totalTrades, 0);
        const totalPnL = stats.reduce((sum, s) => sum + s.pnl, 0);
        const avgWinRate = totalBots > 0
            ? stats.reduce((sum, s) => sum + s.winRate, 0) / totalBots
            : 0;
        return {
            totalBots,
            activeBots,
            totalTrades,
            totalPnL,
            avgWinRate,
        };
    }
    async executeTradingRound(marketId, context) {
        const group = this.marketGroups.get(marketId);
        if (!group || !group.isRunning) {
            return [];
        }
        const decisions = [];
        let tradesExecuted = 0;
        const shuffledBots = [...group.bots].sort(() => Math.random() - 0.5);
        for (const bot of shuffledBots) {
            if (tradesExecuted >= this.maxConcurrentTrades) {
                break;
            }
            if (!bot.canTrade()) {
                continue;
            }
            try {
                const decision = bot.decideTrade(context);
                decisions.push(decision);
                if (decision.shouldTrade) {
                    const success = await bot.executeTrade(decision);
                    if (success) {
                        tradesExecuted++;
                    }
                }
            }
            catch (error) {
                console_1.logger.error("BOT_MANAGER", "Error executing trade", error instanceof Error ? error : new Error(String(error)));
            }
        }
        return decisions;
    }
    isMarketRunning(marketId) {
        var _a;
        return ((_a = this.marketGroups.get(marketId)) === null || _a === void 0 ? void 0 : _a.isRunning) || false;
    }
    getActiveMarkets() {
        return Array.from(this.marketGroups.entries())
            .filter(([, group]) => group.isRunning)
            .map(([marketId]) => marketId);
    }
    startTradingLoop(marketId) {
        const group = this.marketGroups.get(marketId);
        if (!group)
            return;
        const interval = this.calculateLoopInterval(group.bots);
        group.loopInterval = setInterval(async () => {
            if (!group.isRunning)
                return;
            try {
                const orderManager = this.orderManagers.get(marketId);
                if (!orderManager)
                    return;
                const context = await this.buildMarketContext(marketId, orderManager);
                await this.executeTradingRound(marketId, context);
            }
            catch (error) {
                console_1.logger.error("BOT_MANAGER", "Error in trading loop", error instanceof Error ? error : new Error(String(error)));
            }
        }, interval);
    }
    calculateLoopInterval(bots) {
        if (bots.length === 0)
            return this.minLoopInterval;
        const minCooldown = Math.min(...bots.map((bot) => bot.getCooldownTime()));
        return Math.max(this.minLoopInterval, Math.floor(minCooldown / 2));
    }
    async buildMarketContext(marketId, orderManager) {
        var _a, _b, _c, _d, _e;
        const om = orderManager;
        const currentPrice = ((_a = om.getCurrentPrice) === null || _a === void 0 ? void 0 : _a.call(om)) || BigInt(0);
        const targetPrice = ((_b = om.getTargetPrice) === null || _b === void 0 ? void 0 : _b.call(om)) || currentPrice;
        const orderbook = ((_c = om.getOrderbook) === null || _c === void 0 ? void 0 : _c.call(om)) || {
            bids: [],
            asks: [],
            spread: 0,
            midPrice: Number(currentPrice) / 1e18,
        };
        const volatility = 0;
        const recentTrend = "SIDEWAYS";
        return {
            currentPrice,
            targetPrice,
            priceRangeLow: Number(currentPrice) * 0.9,
            priceRangeHigh: Number(currentPrice) * 1.1,
            volatility,
            recentTrend,
            spreadBps: orderbook.spread * 10000,
            recentVolume: BigInt(0),
            orderbook: {
                bestBid: ((_d = orderbook.bids[0]) === null || _d === void 0 ? void 0 : _d.price)
                    ? BigInt(Math.floor(orderbook.bids[0].price * 1e18))
                    : BigInt(0),
                bestAsk: ((_e = orderbook.asks[0]) === null || _e === void 0 ? void 0 : _e.price)
                    ? BigInt(Math.floor(orderbook.asks[0].price * 1e18))
                    : BigInt(0),
            },
        };
    }
    async shutdown() {
        const markets = Array.from(this.marketGroups.keys());
        for (const marketId of markets) {
            await this.stopMarket(marketId);
        }
        this.marketGroups.clear();
        this.orderManagers.clear();
        console_1.logger.info("BOT_MANAGER", "Shutdown complete");
    }
}
exports.BotManager = BotManager;
exports.default = BotManager;
