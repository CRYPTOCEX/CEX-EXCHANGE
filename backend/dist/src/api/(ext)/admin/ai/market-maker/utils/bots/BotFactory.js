"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotFactory = void 0;
const ScalperBot_1 = require("./personalities/ScalperBot");
const SwingBot_1 = require("./personalities/SwingBot");
const AccumulatorBot_1 = require("./personalities/AccumulatorBot");
const DistributorBot_1 = require("./personalities/DistributorBot");
const MarketMakerBot_1 = require("./personalities/MarketMakerBot");
const error_1 = require("@b/utils/error");
const DEFAULT_BOT_DISTRIBUTION = [
    "SCALPER",
    "SCALPER",
    "SWING",
    "ACCUMULATOR",
    "DISTRIBUTOR",
    "MARKET_MAKER",
];
class BotFactory {
    constructor() {
        this.botCounter = 0;
    }
    static getInstance() {
        if (!BotFactory.instance) {
            BotFactory.instance = new BotFactory();
        }
        return BotFactory.instance;
    }
    createBot(config) {
        switch (config.personality) {
            case "SCALPER":
                return new ScalperBot_1.ScalperBot(config);
            case "SWING":
                return new SwingBot_1.SwingBot(config);
            case "ACCUMULATOR":
                return new AccumulatorBot_1.AccumulatorBot(config);
            case "DISTRIBUTOR":
                return new DistributorBot_1.DistributorBot(config);
            case "MARKET_MAKER":
                return new MarketMakerBot_1.MarketMakerBot(config);
            default:
                throw (0, error_1.createError)({ statusCode: 400, message: `Unknown bot personality: ${config.personality}` });
        }
    }
    createBotsForMarket(marketConfig) {
        var _a;
        const personalities = marketConfig.personalities || DEFAULT_BOT_DISTRIBUTION;
        const bots = [];
        const balanceDistribution = this.calculateBalanceDistribution(personalities);
        for (let i = 0; i < personalities.length; i++) {
            const personality = personalities[i];
            const distribution = balanceDistribution[personality];
            const customConfig = ((_a = marketConfig.customBotConfigs) === null || _a === void 0 ? void 0 : _a[i]) || {};
            const botConfig = {
                id: this.generateBotId(marketConfig.marketId, personality),
                name: `${personality}-${marketConfig.symbol}-${i + 1}`,
                marketMakerId: marketConfig.marketId,
                personality,
                riskTolerance: this.getDefaultRiskTolerance(personality),
                tradeFrequency: this.getDefaultFrequency(personality),
                avgOrderSize: marketConfig.avgOrderSize * distribution.sizeMultiplier,
                orderSizeVariance: 0.2,
                preferredSpread: this.getDefaultSpread(personality),
                maxDailyTrades: this.getDefaultMaxDailyTrades(personality),
                ...customConfig,
            };
            const bot = this.createBot(botConfig);
            bots.push(bot);
        }
        return bots;
    }
    createBalancedBotSet(marketConfig) {
        const balancedPersonalities = [
            "ACCUMULATOR",
            "SWING",
            "MARKET_MAKER",
            "MARKET_MAKER",
            "SWING",
            "DISTRIBUTOR",
        ];
        return this.createBotsForMarket({
            ...marketConfig,
            personalities: balancedPersonalities,
        });
    }
    createAggressiveBotSet(marketConfig) {
        const aggressivePersonalities = [
            "SCALPER",
            "SCALPER",
            "SCALPER",
            "MARKET_MAKER",
            "MARKET_MAKER",
            "SWING",
        ];
        return this.createBotsForMarket({
            ...marketConfig,
            personalities: aggressivePersonalities,
        });
    }
    createConservativeBotSet(marketConfig) {
        const conservativePersonalities = [
            "SWING",
            "SWING",
            "ACCUMULATOR",
            "DISTRIBUTOR",
        ];
        return this.createBotsForMarket({
            ...marketConfig,
            personalities: conservativePersonalities,
        });
    }
    createSingleBot(marketId, symbol, personality, baseBalance, quoteBalance, avgOrderSize) {
        const config = {
            id: this.generateBotId(marketId, personality),
            name: `${personality}-${symbol}`,
            marketMakerId: marketId,
            personality,
            riskTolerance: this.getDefaultRiskTolerance(personality),
            tradeFrequency: this.getDefaultFrequency(personality),
            avgOrderSize,
            orderSizeVariance: 0.2,
            preferredSpread: this.getDefaultSpread(personality),
            maxDailyTrades: this.getDefaultMaxDailyTrades(personality),
        };
        return this.createBot(config);
    }
    generateBotId(marketId, personality) {
        this.botCounter++;
        const timestamp = Date.now().toString(36);
        const counter = this.botCounter.toString(36).padStart(4, "0");
        const personalityCode = personality.substring(0, 3).toUpperCase();
        return `${marketId}-${personalityCode}-${timestamp}-${counter}`;
    }
    getDefaultFrequency(personality) {
        switch (personality) {
            case "SCALPER":
            case "MARKET_MAKER":
                return "HIGH";
            case "SWING":
                return "MEDIUM";
            case "ACCUMULATOR":
            case "DISTRIBUTOR":
                return "LOW";
            default:
                return "MEDIUM";
        }
    }
    getDefaultRiskTolerance(personality) {
        switch (personality) {
            case "SCALPER":
                return 0.3;
            case "SWING":
                return 0.5;
            case "ACCUMULATOR":
                return 0.4;
            case "DISTRIBUTOR":
                return 0.4;
            case "MARKET_MAKER":
                return 0.6;
            default:
                return 0.5;
        }
    }
    getDefaultSpread(personality) {
        switch (personality) {
            case "SCALPER":
                return 0.001;
            case "SWING":
                return 0.005;
            case "ACCUMULATOR":
                return 0.003;
            case "DISTRIBUTOR":
                return 0.003;
            case "MARKET_MAKER":
                return 0.002;
            default:
                return 0.003;
        }
    }
    getDefaultMaxDailyTrades(personality) {
        switch (personality) {
            case "SCALPER":
                return 200;
            case "SWING":
                return 20;
            case "ACCUMULATOR":
                return 30;
            case "DISTRIBUTOR":
                return 30;
            case "MARKET_MAKER":
                return 100;
            default:
                return 50;
        }
    }
    calculateBalanceDistribution(personalities) {
        const counts = {
            SCALPER: 0,
            SWING: 0,
            ACCUMULATOR: 0,
            DISTRIBUTOR: 0,
            MARKET_MAKER: 0,
        };
        for (const p of personalities) {
            counts[p]++;
        }
        const total = personalities.length;
        const weights = {
            SCALPER: { base: 0.1, quote: 0.1, size: 0.5 },
            SWING: { base: 0.2, quote: 0.2, size: 1.0 },
            ACCUMULATOR: { base: 0.15, quote: 0.25, size: 0.8 },
            DISTRIBUTOR: { base: 0.25, quote: 0.15, size: 0.8 },
            MARKET_MAKER: { base: 0.2, quote: 0.2, size: 0.6 },
        };
        let totalBaseWeight = 0;
        let totalQuoteWeight = 0;
        for (const p of personalities) {
            totalBaseWeight += weights[p].base;
            totalQuoteWeight += weights[p].quote;
        }
        const distribution = {
            SCALPER: { basePercent: 0, quotePercent: 0, sizeMultiplier: 0.5 },
            SWING: { basePercent: 0, quotePercent: 0, sizeMultiplier: 1.0 },
            ACCUMULATOR: { basePercent: 0, quotePercent: 0, sizeMultiplier: 0.8 },
            DISTRIBUTOR: { basePercent: 0, quotePercent: 0, sizeMultiplier: 0.8 },
            MARKET_MAKER: { basePercent: 0, quotePercent: 0, sizeMultiplier: 0.6 },
        };
        for (const p of Object.keys(weights)) {
            if (counts[p] > 0) {
                distribution[p] = {
                    basePercent: weights[p].base / totalBaseWeight / counts[p],
                    quotePercent: weights[p].quote / totalQuoteWeight / counts[p],
                    sizeMultiplier: weights[p].size,
                };
            }
        }
        return distribution;
    }
    getRecommendedBotCount(dailyVolume) {
        if (dailyVolume < 10000) {
            return 3;
        }
        else if (dailyVolume < 100000) {
            return 5;
        }
        else if (dailyVolume < 1000000) {
            return 8;
        }
        else {
            return 12;
        }
    }
    getRecommendedPersonalities(marketType) {
        switch (marketType) {
            case "STABLE":
                return [
                    "MARKET_MAKER",
                    "MARKET_MAKER",
                    "SCALPER",
                    "ACCUMULATOR",
                    "DISTRIBUTOR",
                ];
            case "VOLATILE":
                return [
                    "SCALPER",
                    "SCALPER",
                    "SCALPER",
                    "MARKET_MAKER",
                    "SWING",
                ];
            case "TRENDING":
                return [
                    "SWING",
                    "SWING",
                    "ACCUMULATOR",
                    "DISTRIBUTOR",
                    "SCALPER",
                ];
            default:
                return DEFAULT_BOT_DISTRIBUTION;
        }
    }
}
exports.BotFactory = BotFactory;
exports.default = BotFactory;
