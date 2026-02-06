"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const cache_1 = require("@b/utils/cache");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Get landing page statistics based on enabled extensions",
    description: "Returns platform statistics and features based on enabled extensions and settings",
    operationId: "getLandingStats",
    tags: ["Content"],
    requiresAuth: false,
    responses: {
        200: {
            description: "Landing page statistics retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            platform: { type: "object" },
                            extensions: { type: "object" },
                            features: { type: "array" },
                        },
                    },
                },
            },
        },
        500: query_1.serverErrorResponse,
    },
};
async function safeCount(model, where = {}) {
    try {
        if (!model)
            return 0;
        return await model.count({ where });
    }
    catch (_a) {
        return 0;
    }
}
async function safeSum(model, field, where = {}) {
    try {
        if (!model)
            return 0;
        const result = await model.sum(field, { where });
        return result || 0;
    }
    catch (_a) {
        return 0;
    }
}
exports.default = async () => {
    var _a;
    try {
        const cacheManager = cache_1.CacheManager.getInstance();
        const extensions = await cacheManager.getExtensions();
        const extensionNames = Array.from(extensions.keys());
        const spotWallets = await cacheManager.getSetting("spotWallets");
        const isSpotEnabled = spotWallets === true || spotWallets === "true";
        const [totalUsers, activeUsers,] = await Promise.all([
            safeCount(db_1.models.user),
            safeCount(db_1.models.user, { status: "ACTIVE" }),
        ]);
        const response = {
            platform: {
                users: totalUsers,
                activeUsers: activeUsers,
                verified: 0,
            },
            extensions: {},
            features: [],
            settings: {
                spotEnabled: isSpotEnabled,
            }
        };
        try {
            const verifiedUsers = await ((_a = db_1.models.kycApplication) === null || _a === void 0 ? void 0 : _a.count({
                where: { status: "APPROVED" }
            }));
            response.platform.verified = verifiedUsers || 0;
        }
        catch (_b) { }
        if (isSpotEnabled) {
            try {
                const [tradingVolume, totalOrders] = await Promise.all([
                    safeSum(db_1.models.exchangeOrder, "cost", { status: "CLOSED" }),
                    safeCount(db_1.models.exchangeOrder),
                ]);
                response.extensions.spot = {
                    enabled: true,
                    volume: tradingVolume,
                    orders: totalOrders,
                };
                response.features.push({
                    id: "spot",
                    title: "Spot Trading",
                    description: "Trade cryptocurrencies instantly with real-time market data and advanced charting tools.",
                    icon: "TrendingUp",
                    gradient: "from-blue-500 to-cyan-500",
                    stats: [
                        { label: "Trading Volume", value: formatValue(tradingVolume), icon: "DollarSign" },
                        { label: "Total Orders", value: formatNumber(totalOrders), icon: "Activity" },
                    ],
                    link: "/trade",
                });
            }
            catch (_c) { }
        }
        if (extensionNames.includes("binary")) {
            try {
                const [binaryOrders, binaryVolume] = await Promise.all([
                    safeCount(db_1.models.binaryOrder),
                    safeSum(db_1.models.binaryOrder, "amount"),
                ]);
                response.extensions.binary = {
                    enabled: true,
                    orders: binaryOrders,
                    volume: binaryVolume,
                };
                response.features.push({
                    id: "binary",
                    title: "Binary Options",
                    description: "Predict market movements and earn high returns with our binary options trading platform.",
                    icon: "Target",
                    gradient: "from-purple-500 to-pink-500",
                    stats: [
                        { label: "Total Trades", value: formatNumber(binaryOrders), icon: "Activity" },
                        { label: "Volume", value: formatValue(binaryVolume), icon: "DollarSign" },
                    ],
                    link: "/binary",
                });
            }
            catch (_d) { }
        }
        if (extensionNames.includes("futures")) {
            try {
                const futuresMarkets = await safeCount(db_1.models.futuresMarket, { status: true });
                const futuresPositions = 0;
                response.extensions.futures = {
                    enabled: true,
                    markets: futuresMarkets,
                    positions: futuresPositions,
                };
                response.features.push({
                    id: "futures",
                    title: "Futures Trading",
                    description: "Trade perpetual futures with up to 100x leverage on major cryptocurrency pairs.",
                    icon: "Rocket",
                    gradient: "from-orange-500 to-red-500",
                    stats: [
                        { label: "Markets", value: formatNumber(futuresMarkets), icon: "BarChart3" },
                        { label: "Positions", value: formatNumber(futuresPositions), icon: "Layers" },
                    ],
                    link: "/futures",
                });
            }
            catch (_e) { }
        }
        if (extensionNames.includes("ecosystem")) {
            try {
                const [tokens, markets] = await Promise.all([
                    safeCount(db_1.models.ecosystemToken, { status: true }),
                    safeCount(db_1.models.ecosystemMarket, { status: true }),
                ]);
                response.extensions.ecosystem = {
                    enabled: true,
                    tokens,
                    markets,
                };
                response.features.push({
                    id: "ecosystem",
                    title: "Native Tokens",
                    description: "Trade native blockchain tokens with direct wallet integration and low fees.",
                    icon: "Layers",
                    gradient: "from-emerald-500 to-teal-500",
                    stats: [
                        { label: "Tokens", value: formatNumber(tokens), icon: "Coins" },
                        { label: "Markets", value: formatNumber(markets), icon: "BarChart3" },
                    ],
                    link: "/ecosystem",
                });
            }
            catch (_f) { }
        }
        if (extensionNames.includes("staking")) {
            try {
                const [activePools, totalStaked, positions, featuredPools] = await Promise.all([
                    safeCount(db_1.models.stakingPool, { status: "ACTIVE" }),
                    safeSum(db_1.models.stakingPosition, "amount", { status: "ACTIVE" }),
                    safeCount(db_1.models.stakingPosition, { status: "ACTIVE" }),
                    db_1.models.stakingPool.findAll({
                        where: { status: "ACTIVE" },
                        attributes: ["id", "name", "currency", "minStake", "lockPeriod", "apr"],
                        order: [["createdAt", "DESC"]],
                        limit: 3,
                        raw: true,
                    }).catch(() => []),
                ]);
                const poolsWithApr = featuredPools.map((pool) => ({
                    name: pool.name,
                    symbol: pool.currency,
                    apr: pool.apr || 0,
                    minStake: pool.minStake || 0,
                    lockPeriod: pool.lockPeriod || 0,
                }));
                response.extensions.staking = {
                    enabled: true,
                    pools: activePools,
                    totalStaked,
                    positions,
                };
                response.features.push({
                    id: "staking",
                    title: "Staking Pools",
                    description: "Earn passive income by staking your crypto assets in our high-yield staking pools.",
                    icon: "Percent",
                    gradient: "from-green-500 to-emerald-500",
                    stats: [
                        { label: "Active Pools", value: formatNumber(activePools), icon: "Database" },
                        { label: "Total Staked", value: formatValue(totalStaked), icon: "Lock" },
                    ],
                    link: "/staking",
                    data: {
                        featuredPools: poolsWithApr,
                        highestApr: poolsWithApr.length > 0 ? Math.max(...poolsWithApr.map(p => p.apr)) : 0,
                    },
                });
            }
            catch (_g) { }
        }
        if (extensionNames.includes("ico")) {
            try {
                const [activeOfferings, totalRaised] = await Promise.all([
                    safeCount(db_1.models.icoTokenOffering, { status: "ACTIVE" }),
                    safeSum(db_1.models.icoTransaction, "amount", { status: "COMPLETED" }),
                ]);
                response.extensions.ico = {
                    enabled: true,
                    offerings: activeOfferings,
                    raised: totalRaised,
                };
                if (activeOfferings > 0) {
                    response.features.push({
                        id: "ico",
                        title: "Token Offerings",
                        description: "Participate in token sales and get early access to promising blockchain projects.",
                        icon: "Rocket",
                        gradient: "from-amber-500 to-orange-500",
                        stats: [
                            { label: "Active Offerings", value: formatNumber(activeOfferings), icon: "Flame" },
                            { label: "Total Raised", value: formatValue(totalRaised), icon: "TrendingUp" },
                        ],
                        link: "/ico",
                    });
                }
            }
            catch (_h) { }
        }
        if (extensionNames.includes("ai")) {
            try {
                const [activePlans, totalInvested, investors] = await Promise.all([
                    safeCount(db_1.models.aiInvestmentPlan, { status: true }),
                    safeSum(db_1.models.aiInvestment, "amount", { status: "ACTIVE" }),
                    safeCount(db_1.models.aiInvestment, {
                        status: "ACTIVE"
                    }),
                ]);
                response.extensions.ai = {
                    enabled: true,
                    plans: activePlans,
                    invested: totalInvested,
                    investors,
                };
                response.features.push({
                    id: "ai",
                    title: "AI Investment",
                    description: "Let our AI-powered algorithms grow your investment with automated trading strategies.",
                    icon: "Brain",
                    gradient: "from-violet-500 to-purple-500",
                    stats: [
                        { label: "Investment Plans", value: formatNumber(activePlans), icon: "Sparkles" },
                        { label: "Total Invested", value: formatValue(totalInvested), icon: "TrendingUp" },
                    ],
                    link: "/ai/investment",
                });
            }
            catch (_j) { }
        }
        if (extensionNames.includes("copy-trading")) {
            try {
                const [leaders, followers, totalVolume] = await Promise.all([
                    safeCount(db_1.models.copyTradingLeader, { status: "ACTIVE" }),
                    safeCount(db_1.models.copyTradingFollower, { status: "ACTIVE" }),
                    safeSum(db_1.models.copyTradingTrade, "amount"),
                ]);
                response.extensions.copyTrading = {
                    enabled: true,
                    leaders,
                    followers,
                    volume: totalVolume,
                };
                response.features.push({
                    id: "copyTrading",
                    title: "Copy Trading",
                    description: "Follow successful traders and automatically copy their trades to your portfolio.",
                    icon: "Copy",
                    gradient: "from-cyan-500 to-blue-500",
                    stats: [
                        { label: "Pro Traders", value: formatNumber(leaders), icon: "Award" },
                        { label: "Followers", value: formatNumber(followers), icon: "Users" },
                    ],
                    link: "/copy-trading",
                });
            }
            catch (_k) { }
        }
        if (extensionNames.includes("affiliate")) {
            try {
                const [affiliates, totalEarnings] = await Promise.all([
                    safeCount(db_1.models.mlmReferral),
                    safeSum(db_1.models.mlmReferralReward, "reward"),
                ]);
                response.extensions.affiliate = {
                    enabled: true,
                    affiliates,
                    earnings: totalEarnings,
                };
                response.features.push({
                    id: "affiliate",
                    title: "Affiliate Program",
                    description: "Earn commissions by referring friends and building your affiliate network.",
                    icon: "Gift",
                    gradient: "from-rose-500 to-pink-500",
                    stats: [
                        { label: "Affiliates", value: formatNumber(affiliates), icon: "Users" },
                        { label: "Total Earnings", value: formatValue(totalEarnings), icon: "DollarSign" },
                    ],
                    link: "/affiliate",
                });
            }
            catch (_l) { }
        }
        if (extensionNames.includes("gateway")) {
            try {
                const [merchants, payments] = await Promise.all([
                    safeCount(db_1.models.gatewayMerchant, { status: "ACTIVE" }),
                    safeCount(db_1.models.gatewayPayment, { status: "COMPLETED" }),
                ]);
                response.extensions.gateway = {
                    enabled: true,
                    merchants,
                    payments,
                };
            }
            catch (_m) { }
        }
        return response;
    }
    catch (error) {
        console.error("Landing stats error:", error);
        return query_1.serverErrorResponse;
    }
};
function formatNumber(num) {
    if (num >= 1000000)
        return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000)
        return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}
function formatValue(value) {
    if (value >= 1000000000)
        return `$${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000)
        return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000)
        return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
}
