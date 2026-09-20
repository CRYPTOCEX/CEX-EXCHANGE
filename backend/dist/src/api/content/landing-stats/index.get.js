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
const EXT = {
    aiInvestment: "ai_investment",
    copyTrading: "copy_trading",
    ecommerce: "ecommerce",
    ecosystem: "ecosystem",
    forex: "forex",
    forexTrading: "forex_trading",
    futures: "futures",
    gateway: "gateway",
    hummingbot: "hummingbot",
    ico: "ico",
    mlm: "mlm",
    nft: "nft",
    p2p: "p2p",
    staking: "staking",
    tradingBot: "trading_bot",
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
        return Number(result) || 0;
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
        const extensionNames = new Set(Array.from(extensions.keys()));
        const has = (name) => extensionNames.has(name);
        const isSpotEnabled = await cacheManager.getSettingBool("spotWallets", true);
        const binaryStatus = await cacheManager.getSetting("binaryStatus");
        const isBinaryEnabled = binaryStatus === true || binaryStatus === "true";
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
                binaryEnabled: isBinaryEnabled,
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
                    stats: [
                        { label: "Trading Volume", value: formatValue(tradingVolume), icon: "DollarSign" },
                        { label: "Total Orders", value: formatNumber(totalOrders), icon: "Activity" },
                    ],
                    link: "/trade",
                });
            }
            catch (_c) { }
        }
        if (isBinaryEnabled) {
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
                    description: "Take a position on short-term price direction with fixed risk and a known payout before you commit.",
                    icon: "Target",
                    stats: [
                        { label: "Total Trades", value: formatNumber(binaryOrders), icon: "Activity" },
                        { label: "Volume", value: formatValue(binaryVolume), icon: "DollarSign" },
                    ],
                    link: "/binary",
                });
            }
            catch (_d) { }
        }
        if (has(EXT.futures)) {
            try {
                const futuresMarkets = await safeCount(db_1.models.futuresMarket, { status: true });
                response.extensions.futures = {
                    enabled: true,
                    markets: futuresMarkets,
                };
                response.features.push({
                    id: "futures",
                    title: "Futures Trading",
                    description: "Trade perpetual futures with leverage, isolated or cross margin, and a full risk desk behind them.",
                    icon: "Rocket",
                    stats: [
                        { label: "Markets", value: formatNumber(futuresMarkets), icon: "BarChart3" },
                        { label: "Leverage", value: "Up to 100x", icon: "Layers" },
                    ],
                    link: "/futures",
                });
            }
            catch (_e) { }
        }
        if (has(EXT.forexTrading)) {
            try {
                const [instruments, openPositions, tradedVolume] = await Promise.all([
                    safeCount(db_1.models.fxInstrument, { status: "ACTIVE" }),
                    safeCount(db_1.models.fxPosition, { status: "OPEN" }),
                    safeSum(db_1.models.fxDeal, "amount"),
                ]);
                response.extensions.forexTrading = {
                    enabled: true,
                    instruments,
                    openPositions,
                    volume: tradedVolume,
                };
                response.features.push({
                    id: "forexTrading",
                    title: "Forex & Multi-Asset",
                    description: "Currencies, metals, indices and equities on one margin account, with live pricing, stops and swaps.",
                    icon: "CandlestickChart",
                    stats: [
                        { label: "Instruments", value: formatNumber(instruments), icon: "Globe" },
                        { label: "Open Positions", value: formatNumber(openPositions), icon: "Activity" },
                    ],
                    link: "/forex-trading/trade",
                });
            }
            catch (_f) { }
        }
        if (has(EXT.ecosystem)) {
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
                    description: "Run your own on-chain markets with native wallets, real deposits and withdrawals, and your own fee schedule.",
                    icon: "Layers",
                    stats: [
                        { label: "Tokens", value: formatNumber(tokens), icon: "Coins" },
                        { label: "Markets", value: formatNumber(markets), icon: "BarChart3" },
                    ],
                    link: "/ecosystem",
                });
            }
            catch (_g) { }
        }
        if (has(EXT.staking)) {
            try {
                const [activePools, totalStaked, positions, featuredPools] = await Promise.all([
                    safeCount(db_1.models.stakingPool, { status: "ACTIVE" }),
                    safeSum(db_1.models.stakingPosition, "amount", { status: "ACTIVE" }),
                    safeCount(db_1.models.stakingPosition, { status: "ACTIVE" }),
                    db_1.models.stakingPool.findAll({
                        where: { status: "ACTIVE" },
                        attributes: ["id", "name", "symbol", "minStake", "lockPeriod", "apr"],
                        order: [["createdAt", "DESC"]],
                        limit: 3,
                        raw: true,
                    }).catch(() => []),
                ]);
                const poolsWithApr = featuredPools.map((pool) => ({
                    name: pool.name,
                    symbol: pool.symbol,
                    apr: Number(pool.apr) || 0,
                    minStake: Number(pool.minStake) || 0,
                    lockPeriod: Number(pool.lockPeriod) || 0,
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
                    description: "Offer yield on the assets your users already hold, with lock periods and rates you set per pool.",
                    icon: "Percent",
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
            catch (_h) { }
        }
        if (has(EXT.ico)) {
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
                        description: "Launch a token sale with phases, vesting and a public offering page — no separate launchpad needed.",
                        icon: "Flame",
                        stats: [
                            { label: "Active Offerings", value: formatNumber(activeOfferings), icon: "Flame" },
                            { label: "Total Raised", value: formatValue(totalRaised), icon: "TrendingUp" },
                        ],
                        link: "/ico",
                    });
                }
            }
            catch (_j) { }
        }
        if (has(EXT.aiInvestment)) {
            try {
                const [activePlans, totalInvested, investors] = await Promise.all([
                    safeCount(db_1.models.aiInvestmentPlan, { status: true }),
                    safeSum(db_1.models.aiInvestment, "amount", { status: "ACTIVE" }),
                    safeCount(db_1.models.aiInvestment, { status: "ACTIVE" }),
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
                    description: "Managed investment plans with a defined term and return, sold from your platform under your brand.",
                    icon: "Brain",
                    stats: [
                        { label: "Investment Plans", value: formatNumber(activePlans), icon: "Sparkles" },
                        { label: "Total Invested", value: formatValue(totalInvested), icon: "TrendingUp" },
                    ],
                    link: "/ai/investment",
                });
            }
            catch (_k) { }
        }
        if (has(EXT.forex)) {
            try {
                const [plans, accounts, invested] = await Promise.all([
                    safeCount(db_1.models.forexPlan, { status: true }),
                    safeCount(db_1.models.forexAccount, { status: true }),
                    safeSum(db_1.models.forexInvestment, "amount", { status: "ACTIVE" }),
                ]);
                response.extensions.forex = {
                    enabled: true,
                    plans,
                    accounts,
                    invested,
                };
                response.features.push({
                    id: "forex",
                    title: "Managed Forex",
                    description: "Connect clients to MT4/MT5 accounts and sell managed forex plans with returns you configure.",
                    icon: "Landmark",
                    stats: [
                        { label: "Investment Plans", value: formatNumber(plans), icon: "Layers" },
                        { label: "Total Invested", value: formatValue(invested), icon: "DollarSign" },
                    ],
                    link: "/forex",
                });
            }
            catch (_l) { }
        }
        if (has(EXT.copyTrading)) {
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
                    description: "Let proven traders publish a strategy and have followers mirror it automatically, with your cut on every fill.",
                    icon: "Copy",
                    stats: [
                        { label: "Pro Traders", value: formatNumber(leaders), icon: "Award" },
                        { label: "Followers", value: formatNumber(followers), icon: "Users" },
                    ],
                    link: "/copy-trading",
                });
            }
            catch (_m) { }
        }
        if (has(EXT.tradingBot)) {
            try {
                const [strategies, activeBots, trades] = await Promise.all([
                    safeCount(db_1.models.tradingBotStrategy, { status: "APPROVED" }),
                    safeCount(db_1.models.tradingBot, { status: "RUNNING" }),
                    safeCount(db_1.models.tradingBotTrade, { status: "CLOSED" }),
                ]);
                response.extensions.tradingBot = {
                    enabled: true,
                    strategies,
                    activeBots,
                    trades,
                };
                response.features.push({
                    id: "tradingBot",
                    title: "Trading Bots",
                    description: "A strategy marketplace and paper-trading sandbox, so users automate on your platform instead of leaving for one.",
                    icon: "Cpu",
                    stats: [
                        { label: "Strategies", value: formatNumber(strategies), icon: "Boxes" },
                        { label: "Bots Running", value: formatNumber(activeBots), icon: "Activity" },
                    ],
                    link: "/trading-bot",
                });
            }
            catch (_o) { }
        }
        if (has(EXT.hummingbot)) {
            try {
                const [presets, connectedKeys] = await Promise.all([
                    safeCount(db_1.models.hbStrategyPreset),
                    countHummingbotKeys(),
                ]);
                response.extensions.hummingbot = {
                    enabled: true,
                    presets,
                    connectedKeys,
                };
                response.features.push({
                    id: "hummingbot",
                    title: "Hummingbot Connector",
                    description: "Let users point a self-hosted Hummingbot instance at your books with an HMAC-signed key — market makers bring their own liquidity, you keep the flow.",
                    icon: "Network",
                    stats: [
                        { label: "Strategy Presets", value: formatNumber(presets), icon: "Boxes" },
                        { label: "Connected Bots", value: formatNumber(connectedKeys), icon: "Cpu" },
                    ],
                    link: "/hb",
                });
            }
            catch (_p) { }
        }
        if (has(EXT.p2p)) {
            try {
                const [offers, completedTrades, tradedVolume] = await Promise.all([
                    safeCount(db_1.models.p2pOffer, { status: "ACTIVE" }),
                    safeCount(db_1.models.p2pTrade, { status: "COMPLETED" }),
                    safeSum(db_1.models.p2pTrade, "total", { status: "COMPLETED" }),
                ]);
                response.extensions.p2p = {
                    enabled: true,
                    offers,
                    trades: completedTrades,
                    volume: tradedVolume,
                };
                response.features.push({
                    id: "p2p",
                    title: "P2P Marketplace",
                    description: "Users trade directly with each other in any local payment method, with escrow and dispute resolution you control.",
                    icon: "ArrowLeftRight",
                    stats: [
                        { label: "Live Offers", value: formatNumber(offers), icon: "Store" },
                        { label: "Trades Settled", value: formatNumber(completedTrades), icon: "UserCheck" },
                    ],
                    link: "/p2p",
                });
            }
            catch (_q) { }
        }
        if (has(EXT.nft)) {
            try {
                const [collections, tokens, salesVolume] = await Promise.all([
                    safeCount(db_1.models.nftCollection, { status: "ACTIVE" }),
                    safeCount(db_1.models.nftToken, { status: "MINTED" }),
                    safeSum(db_1.models.nftSale, "price", { status: "COMPLETED" }),
                ]);
                response.extensions.nft = {
                    enabled: true,
                    collections,
                    tokens,
                    volume: salesVolume,
                };
                response.features.push({
                    id: "nft",
                    title: "NFT Marketplace",
                    description: "Mint, list and auction NFTs with royalties enforced on resale and creator payouts handled for you.",
                    icon: "Gem",
                    stats: [
                        { label: "Collections", value: formatNumber(collections), icon: "Boxes" },
                        { label: "Items Minted", value: formatNumber(tokens), icon: "Sparkles" },
                    ],
                    link: "/nft",
                });
            }
            catch (_r) { }
        }
        if (has(EXT.ecommerce)) {
            try {
                const [products, orders] = await Promise.all([
                    safeCount(db_1.models.ecommerceProduct, { status: true }),
                    safeCount(db_1.models.ecommerceOrder, { status: "COMPLETED" }),
                ]);
                response.extensions.ecommerce = {
                    enabled: true,
                    products,
                    orders,
                };
                response.features.push({
                    id: "ecommerce",
                    title: "Crypto Store",
                    description: "Sell physical goods or digital keys for crypto, paid straight from the wallet your users already funded.",
                    icon: "ShoppingBag",
                    stats: [
                        { label: "Products", value: formatNumber(products), icon: "Package" },
                        { label: "Orders Fulfilled", value: formatNumber(orders), icon: "ShoppingCart" },
                    ],
                    link: "/ecommerce",
                });
            }
            catch (_s) { }
        }
        if (has(EXT.gateway)) {
            try {
                const [merchants, payments, processed] = await Promise.all([
                    safeCount(db_1.models.gatewayMerchant, { status: "ACTIVE" }),
                    safeCount(db_1.models.gatewayPayment, { status: "COMPLETED" }),
                    safeSum(db_1.models.gatewayPayment, "amount", { status: "COMPLETED" }),
                ]);
                response.extensions.gateway = {
                    enabled: true,
                    merchants,
                    payments,
                    processed,
                };
                response.features.push({
                    id: "gateway",
                    title: "Payment Gateway",
                    description: "Onboard merchants and let them accept crypto through a hosted checkout, an API and webhooks — you take the fee.",
                    icon: "CreditCard",
                    stats: [
                        { label: "Merchants", value: formatNumber(merchants), icon: "Store" },
                        { label: "Payments Processed", value: formatValue(processed), icon: "DollarSign" },
                    ],
                    link: "/gateway",
                });
            }
            catch (_t) { }
        }
        if (has(EXT.mlm)) {
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
                    description: "Turn your users into your acquisition channel with multi-level referral rewards you define per event.",
                    icon: "Gift",
                    stats: [
                        { label: "Affiliates", value: formatNumber(affiliates), icon: "Users" },
                        { label: "Rewards Paid", value: formatValue(totalEarnings), icon: "DollarSign" },
                    ],
                    link: "/affiliate",
                });
            }
            catch (_u) { }
        }
        return response;
    }
    catch (error) {
        console.error("Landing stats error:", error);
        return query_1.serverErrorResponse;
    }
};
async function countHummingbotKeys() {
    try {
        if (!db_1.models.apiKey)
            return 0;
        const rows = await db_1.models.apiKey.findAll({
            attributes: ["permissions"],
            raw: true,
        });
        return rows.filter((row) => {
            let scopes = row === null || row === void 0 ? void 0 : row.permissions;
            if (typeof scopes === "string") {
                try {
                    scopes = JSON.parse(scopes);
                }
                catch (_a) {
                    return false;
                }
            }
            return (Array.isArray(scopes) &&
                scopes.some((scope) => typeof scope === "string" && scope.startsWith("hb:")));
        }).length;
    }
    catch (_a) {
        return 0;
    }
}
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
