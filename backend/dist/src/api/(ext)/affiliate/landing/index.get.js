"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const cache_1 = require("@b/utils/cache");
const utils_1 = require("@b/api/(ext)/affiliate/utils");
exports.metadata = {
    summary: "Get affiliate landing page data",
    description: "Retrieves comprehensive data for the affiliate landing page including stats, conditions, top affiliates, and recent activity.",
    operationId: "getAffiliateLanding",
    tags: ["Affiliate", "Landing"],
    logModule: "AFFILIATE",
    logTitle: "Get Landing Data",
    responses: {
        200: {
            description: "Affiliate landing page data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            stats: { type: "object" },
                            conditions: { type: "array" },
                            topAffiliates: { type: "array" },
                            recentActivity: { type: "array" },
                        },
                    },
                },
            },
        },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f;
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Affiliate Landing Data");
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [totalAffiliatesCount, totalPaidOutResult, totalReferralsCount, activeReferralsCount, recentRewardsResult, conditions, topAffiliatesResult, recentRewards, avgReferralsResult,] = await Promise.all([
            db_1.models.mlmReferral.count({
                distinct: true,
                col: "referrerId",
            }),
            db_1.models.mlmReferralReward.findOne({
                attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("reward")), "total"]],
                where: { isClaimed: true },
                raw: true,
            }),
            db_1.models.mlmReferral.count(),
            db_1.models.mlmReferral.count({
                where: { status: "ACTIVE" },
            }),
            db_1.models.mlmReferralReward.findOne({
                attributes: [
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("reward")), "total"],
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("DISTINCT referrerId")), "uniqueAffiliates"],
                ],
                where: {
                    createdAt: { [sequelize_1.Op.gte]: thirtyDaysAgo },
                },
                raw: true,
            }),
            db_1.models.mlmReferralCondition.findAll({
                where: { status: true },
                order: [
                    ["type", "ASC"],
                    ["reward", "DESC"],
                ],
            }),
            db_1.models.mlmReferralReward.findAll({
                attributes: [
                    "referrerId",
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("reward")), "totalEarnings"],
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("mlmReferralReward.id")), "rewardCount"],
                ],
                group: ["referrerId"],
                order: [[(0, sequelize_1.literal)("totalEarnings"), "DESC"]],
                limit: 5,
                include: [
                    {
                        model: db_1.models.user,
                        as: "referrer",
                        attributes: ["id", "avatar", "createdAt"],
                    },
                ],
                raw: false,
            }),
            db_1.models.mlmReferralReward.findAll({
                where: {
                    createdAt: { [sequelize_1.Op.gte]: thirtyDaysAgo },
                },
                order: [["createdAt", "DESC"]],
                limit: 10,
                include: [
                    {
                        model: db_1.models.mlmReferralCondition,
                        as: "condition",
                        attributes: ["type", "name", "rewardCurrency"],
                    },
                ],
            }),
            db_1.models.mlmReferral.findOne({
                attributes: [
                    [
                        (0, sequelize_1.literal)("COUNT(*) / NULLIF(COUNT(DISTINCT referrerId), 0)"),
                        "avgReferrals",
                    ],
                ],
                raw: true,
            }),
        ]);
        const totalPaidOut = parseFloat((_a = totalPaidOutResult === null || totalPaidOutResult === void 0 ? void 0 : totalPaidOutResult.total) !== null && _a !== void 0 ? _a : "0") || 0;
        const recentRewardsTotal = parseFloat((_b = recentRewardsResult === null || recentRewardsResult === void 0 ? void 0 : recentRewardsResult.total) !== null && _b !== void 0 ? _b : "0") || 0;
        const uniqueRecentAffiliates = parseInt((_c = recentRewardsResult === null || recentRewardsResult === void 0 ? void 0 : recentRewardsResult.uniqueAffiliates) !== null && _c !== void 0 ? _c : "1") || 1;
        const avgMonthlyEarnings = uniqueRecentAffiliates > 0
            ? recentRewardsTotal / uniqueRecentAffiliates
            : 0;
        const successRate = totalReferralsCount > 0
            ? Math.round((activeReferralsCount / totalReferralsCount) * 100)
            : 0;
        const avgReferrals = parseFloat((_d = avgReferralsResult === null || avgReferralsResult === void 0 ? void 0 : avgReferralsResult.avgReferrals) !== null && _d !== void 0 ? _d : "0") || 0;
        const topEarning = topAffiliatesResult.length > 0
            ? parseFloat((_f = (_e = topAffiliatesResult[0].dataValues) === null || _e === void 0 ? void 0 : _e.totalEarnings) !== null && _f !== void 0 ? _f : "0") || 0
            : 0;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Filtering conditions based on available extensions");
        const cacheManager = cache_1.CacheManager.getInstance();
        const extensions = await cacheManager.getExtensions();
        const conditionExtensionMap = {
            STAKING: "staking",
            STAKING_LOYALTY: "staking",
            P2P_TRADE: "p2p",
            P2P_TRADE_COMPLETION: "p2p",
            AI_INVESTMENT: "ai_investment",
            AI_INVESTMENT_PROFIT: "ai_investment",
            ICO_CONTRIBUTION: "ico",
            ICO_PURCHASE: "ico",
            FOREX_INVESTMENT: "forex",
            FOREX_PROFIT: "forex",
            FOREX_TRADE: "forex",
            ECOMMERCE_PURCHASE: "ecommerce",
            ECOMMERCE_ORDER: "ecommerce",
            NFT_PURCHASE: "nft",
            NFT_SALE: "nft",
            NFT_TRADE: "nft",
            COPY_TRADING: "copy_trading",
            COPY_TRADING_PROFIT: "copy_trading",
            FUTURES_TRADE: "futures",
            FUTURES_PROFIT: "futures",
            FUTURES_VOLUME: "futures",
            TOKEN_PURCHASE: "ecosystem",
            TOKEN_SALE: "ecosystem",
            SPOT_TRADE: "ecosystem",
            SPOT_TRADE_VOLUME: "ecosystem",
        };
        const filteredConditions = conditions.filter((condition) => {
            const requiredExtension = conditionExtensionMap[condition.name];
            if (requiredExtension) {
                return extensions.has(requiredExtension);
            }
            return true;
        });
        const conditionsFormatted = filteredConditions.map((c) => ({
            id: c.id,
            name: c.name,
            title: c.title,
            description: c.description,
            type: c.type,
            reward: c.reward,
            rewardType: c.rewardType,
            rewardCurrency: c.rewardCurrency,
            rewardWalletType: c.rewardWalletType,
            displayReward: c.rewardType === "PERCENTAGE"
                ? `${c.reward}%`
                : `${c.reward} ${c.rewardCurrency}`,
            category: getConditionCategory(c.type),
            icon: getConditionIcon(c.type),
        }));
        const topAffiliatesFormatted = topAffiliatesResult.map((a, index) => {
            var _a, _b, _c, _d;
            const referrer = a.referrer || ((_a = a.dataValues) === null || _a === void 0 ? void 0 : _a.referrer);
            const referrerId = a.referrerId || ((_b = a.dataValues) === null || _b === void 0 ? void 0 : _b.referrerId);
            return {
                rank: index + 1,
                avatar: (referrer === null || referrer === void 0 ? void 0 : referrer.avatar) || null,
                displayName: `Affiliate #${String(referrerId).slice(-4).toUpperCase()}`,
                totalEarnings: parseFloat((_c = a.dataValues) === null || _c === void 0 ? void 0 : _c.totalEarnings) || 0,
                rewardCount: parseInt((_d = a.dataValues) === null || _d === void 0 ? void 0 : _d.rewardCount) || 0,
                joinedAgo: (referrer === null || referrer === void 0 ? void 0 : referrer.createdAt)
                    ? getTimeAgo(new Date(referrer.createdAt))
                    : "Unknown",
            };
        });
        const recentActivityFormatted = recentRewards.slice(0, 8).map((r) => {
            var _a, _b, _c;
            return ({
                type: "reward_earned",
                amount: r.reward,
                conditionType: ((_a = r.condition) === null || _a === void 0 ? void 0 : _a.type) || "UNKNOWN",
                conditionName: ((_b = r.condition) === null || _b === void 0 ? void 0 : _b.name) || "Reward",
                currency: ((_c = r.condition) === null || _c === void 0 ? void 0 : _c.rewardCurrency) || "USD",
                timeAgo: getTimeAgo(new Date(r.createdAt)),
            });
        });
        const { mlmSystem } = await (0, utils_1.getMlmSystemAndSettings)();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Affiliate landing data retrieved successfully");
        return {
            stats: {
                totalAffiliates: totalAffiliatesCount,
                totalPaidOut: Math.round(totalPaidOut * 100) / 100,
                avgMonthlyEarnings: Math.round(avgMonthlyEarnings * 100) / 100,
                successRate,
                topEarning: Math.round(topEarning * 100) / 100,
                avgReferrals: Math.round(avgReferrals * 10) / 10,
            },
            conditions: conditionsFormatted,
            topAffiliates: topAffiliatesFormatted,
            recentActivity: recentActivityFormatted,
            mlmSystem,
        };
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error retrieving affiliate landing data: ${error.message}`,
        });
    }
};
function getConditionCategory(type) {
    const categories = {
        TRADE: "Trading",
        TRADE_COMMISSION: "Trading",
        SPOT_TRADE: "Trading",
        SPOT_TRADE_VOLUME: "Trading",
        MONTHLY_TRADE_VOLUME: "Trading",
        DEPOSIT: "Deposits",
        FIRST_DEPOSIT_BONUS: "Deposits",
        WELCOME_BONUS: "Deposits",
        INVESTMENT: "Investments",
        GENERAL_INVESTMENT: "Investments",
        AI_INVESTMENT: "Investments",
        AI_INVESTMENT_PROFIT: "Investments",
        FOREX_INVESTMENT: "Investments",
        FOREX_PROFIT: "Investments",
        FOREX_TRADE: "Investments",
        STAKING: "Staking",
        STAKING_LOYALTY: "Staking",
        ICO_CONTRIBUTION: "ICO",
        ICO_PURCHASE: "ICO",
        ECOMMERCE_PURCHASE: "E-commerce",
        ECOMMERCE_ORDER: "E-commerce",
        P2P_TRADE: "P2P Trading",
        P2P_TRADE_COMPLETION: "P2P Trading",
        BINARY_WIN: "Network",
        BINARY_WIN_COMMISSION: "Network",
        BINARY_TRADE_VOLUME: "Network",
        NFT_PURCHASE: "NFT",
        NFT_SALE: "NFT",
        NFT_TRADE: "NFT",
        COPY_TRADING: "Copy Trading",
        COPY_TRADING_PROFIT: "Copy Trading",
        FUTURES_TRADE: "Futures",
        FUTURES_PROFIT: "Futures",
        FUTURES_VOLUME: "Futures",
        TOKEN_PURCHASE: "Tokens",
        TOKEN_SALE: "Tokens",
    };
    return categories[type] || "Other";
}
function getConditionIcon(type) {
    const icons = {
        TRADE: "LineChart",
        TRADE_COMMISSION: "LineChart",
        SPOT_TRADE: "BarChart3",
        SPOT_TRADE_VOLUME: "BarChart3",
        MONTHLY_TRADE_VOLUME: "Calendar",
        DEPOSIT: "DollarSign",
        FIRST_DEPOSIT_BONUS: "DollarSign",
        WELCOME_BONUS: "PartyPopper",
        INVESTMENT: "TrendingUp",
        GENERAL_INVESTMENT: "TrendingUp",
        AI_INVESTMENT: "Bot",
        AI_INVESTMENT_PROFIT: "Bot",
        FOREX_INVESTMENT: "Globe",
        FOREX_PROFIT: "Globe",
        FOREX_TRADE: "Globe",
        STAKING: "Coins",
        STAKING_LOYALTY: "Coins",
        ICO_CONTRIBUTION: "Rocket",
        ICO_PURCHASE: "Rocket",
        ECOMMERCE_PURCHASE: "ShoppingBag",
        ECOMMERCE_ORDER: "ShoppingBag",
        P2P_TRADE: "Users",
        P2P_TRADE_COMPLETION: "Users",
        BINARY_WIN: "Network",
        BINARY_WIN_COMMISSION: "Network",
        BINARY_TRADE_VOLUME: "Network",
        NFT_PURCHASE: "Image",
        NFT_SALE: "Image",
        NFT_TRADE: "Image",
        COPY_TRADING: "Copy",
        COPY_TRADING_PROFIT: "Copy",
        FUTURES_TRADE: "CandlestickChart",
        FUTURES_PROFIT: "CandlestickChart",
        FUTURES_VOLUME: "CandlestickChart",
        TOKEN_PURCHASE: "Coins",
        TOKEN_SALE: "Coins",
    };
    return icons[type] || "Gift";
}
function getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60)
        return "just now";
    if (seconds < 3600)
        return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400)
        return `${Math.floor(seconds / 3600)}h ago`;
    const days = Math.floor(seconds / 86400);
    if (days === 1)
        return "1 day ago";
    if (days < 30)
        return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months === 1)
        return "1 month ago";
    return `${months} months ago`;
}
