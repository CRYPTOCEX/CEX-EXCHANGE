"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const date_fns_1 = require("date-fns");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("@b/api/finance/currency/utils");
const console_1 = require("@b/utils/console");
const priceCache = new Map();
const PRICE_CACHE_DURATION = 5 * 60 * 1000;
const failedPriceCache = new Map();
const FAILURE_CACHE_DURATION = 60 * 60 * 1000;
function getCachedPrice(currency, type) {
    const key = `${currency}-${type}`;
    const cached = priceCache.get(key);
    if (!cached)
        return null;
    const now = Date.now();
    if (now - cached.timestamp > PRICE_CACHE_DURATION) {
        priceCache.delete(key);
        return null;
    }
    return cached.price;
}
function setCachedPrice(currency, type, price) {
    const key = `${currency}-${type}`;
    priceCache.set(key, { price, timestamp: Date.now() });
}
function isCurrencyFailureCached(currency, type) {
    const key = `${currency}-${type}`;
    const cachedTime = failedPriceCache.get(key);
    if (!cachedTime)
        return false;
    const now = Date.now();
    if (now - cachedTime > FAILURE_CACHE_DURATION) {
        failedPriceCache.delete(key);
        return false;
    }
    return true;
}
function cacheCurrencyFailure(currency, type) {
    const key = `${currency}-${type}`;
    failedPriceCache.set(key, Date.now());
}
async function fetchPriceWithCache(currency, type) {
    const cachedPrice = getCachedPrice(currency, type);
    if (cachedPrice !== null) {
        return cachedPrice;
    }
    if (isCurrencyFailureCached(currency, type)) {
        return 0;
    }
    try {
        let price = 0;
        if (type === 'FIAT') {
            price = await (0, utils_1.getFiatPriceInUSD)(currency);
        }
        else if (type === 'SPOT' || type === 'FUTURES') {
            price = await (0, utils_1.getSpotPriceInUSD)(currency);
        }
        else if (type === 'ECO') {
            price = await (0, utils_1.getEcoPriceInUSD)(currency);
        }
        setCachedPrice(currency, type, price);
        return price;
    }
    catch (error) {
        cacheCurrencyFailure(currency, type);
        console_1.logger.debug("WALLET", `Price unavailable for ${currency}/${type} - using $0 (cached 1h)`);
        return 0;
    }
}
exports.metadata = {
    summary: "Get wallet statistics including total balance, changes, and counts",
    operationId: "getWalletStats",
    tags: ["Finance", "Wallets", "Statistics"],
    responses: {
        200: {
            description: "Wallet statistics retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            totalBalance: {
                                type: "number",
                                description: "Total balance across all wallets in USD equivalent"
                            },
                            totalChange: {
                                type: "number",
                                description: "24h change in USD"
                            },
                            totalChangePercent: {
                                type: "number",
                                description: "24h change percentage"
                            },
                            totalWallets: {
                                type: "number",
                                description: "Total number of wallets"
                            },
                            activeWallets: {
                                type: "number",
                                description: "Number of wallets with balance > 0"
                            },
                            walletsByType: {
                                type: "object",
                                properties: {
                                    FIAT: {
                                        type: "object",
                                        properties: {
                                            count: { type: "number" },
                                            balance: { type: "number" },
                                            balanceUSD: { type: "number" }
                                        }
                                    },
                                    SPOT: {
                                        type: "object",
                                        properties: {
                                            count: { type: "number" },
                                            balance: { type: "number" },
                                            balanceUSD: { type: "number" }
                                        }
                                    },
                                    ECO: {
                                        type: "object",
                                        properties: {
                                            count: { type: "number" },
                                            balance: { type: "number" },
                                            balanceUSD: { type: "number" }
                                        }
                                    },
                                    FUTURES: {
                                        type: "object",
                                        properties: {
                                            count: { type: "number" },
                                            balance: { type: "number" },
                                            balanceUSD: { type: "number" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse
    },
    requiresAuth: true
};
exports.default = async (data) => {
    var _a, _b, _c, _d;
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating wallet statistics");
        const [wallets, pendingDeposits] = await Promise.all([
            db_1.models.wallet.findAll({
                where: { userId: user.id },
                attributes: ["id", "type", "currency", "balance", "inOrder", "status", "createdAt", "updatedAt"]
            }),
            db_1.models.transaction.findAll({
                where: {
                    userId: user.id,
                    type: "DEPOSIT",
                    status: "PENDING"
                },
                attributes: ["walletId", "amount", "fee"]
            })
        ]);
        let totalBalanceUSD = 0;
        const walletsByType = {
            FIAT: { count: 0, balance: 0, balanceUSD: 0 },
            SPOT: { count: 0, balance: 0, balanceUSD: 0 },
            ECO: { count: 0, balance: 0, balanceUSD: 0 },
            FUTURES: { count: 0, balance: 0, balanceUSD: 0 }
        };
        let activeWallets = 0;
        const pendingDepositMap = new Map();
        for (const deposit of pendingDeposits) {
            const netAmount = (Number(deposit.amount) || 0) - (Number(deposit.fee) || 0);
            const currentPending = pendingDepositMap.get(deposit.walletId) || 0;
            pendingDepositMap.set(deposit.walletId, currentPending + netAmount);
        }
        const uniqueCurrencies = new Map();
        for (const wallet of wallets) {
            const type = wallet.type || 'SPOT';
            const key = `${wallet.currency}-${type}`;
            if (!uniqueCurrencies.has(key)) {
                uniqueCurrencies.set(key, { currency: wallet.currency, type });
            }
        }
        const pricePromises = Array.from(uniqueCurrencies.values()).map(async ({ currency, type }) => {
            const price = await fetchPriceWithCache(currency, type);
            return { key: `${currency}-${type}`, price };
        });
        const priceResults = await Promise.all(pricePromises);
        const priceMap = new Map();
        for (const { key, price } of priceResults) {
            priceMap.set(key, price);
        }
        for (const wallet of wallets) {
            const balance = Number(wallet.balance) || 0;
            const inOrder = Number(wallet.inOrder) || 0;
            const totalWalletBalance = balance + inOrder;
            const pendingDeposit = pendingDepositMap.get(wallet.id) || 0;
            const estimatedBalance = totalWalletBalance + pendingDeposit;
            const type = wallet.type || 'SPOT';
            if (estimatedBalance > 0) {
                activeWallets++;
            }
            if (!walletsByType[type]) {
                walletsByType[type] = { count: 0, balance: 0, balanceUSD: 0 };
            }
            walletsByType[type].count++;
            walletsByType[type].balance += estimatedBalance;
            const price = priceMap.get(`${wallet.currency}-${type}`) || 0;
            const balanceUSD = estimatedBalance * price;
            walletsByType[type].balanceUSD += balanceUSD;
            totalBalanceUSD += balanceUSD;
        }
        const yesterday = (0, date_fns_1.subDays)(new Date(), 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayPnl = await db_1.models.walletPnl.findOne({
            where: {
                userId: user.id,
                createdAt: {
                    [sequelize_1.Op.gte]: yesterday,
                    [sequelize_1.Op.lt]: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000)
                }
            },
            order: [['createdAt', 'DESC']]
        });
        let totalChange = 0;
        let totalChangePercent = 0;
        if (yesterdayPnl && yesterdayPnl.balances) {
            const yesterdayBalance = Object.values(yesterdayPnl.balances).reduce((sum, balance) => {
                const numBalance = typeof balance === 'number' ? balance : parseFloat(String(balance)) || 0;
                return sum + numBalance;
            }, 0);
            if (yesterdayBalance > 0) {
                totalChange = totalBalanceUSD - yesterdayBalance;
                totalChangePercent = (totalChange / yesterdayBalance) * 100;
            }
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayBalances = {
            FIAT: ((_a = walletsByType.FIAT) === null || _a === void 0 ? void 0 : _a.balanceUSD) || 0,
            SPOT: ((_b = walletsByType.SPOT) === null || _b === void 0 ? void 0 : _b.balanceUSD) || 0,
            ECO: ((_c = walletsByType.ECO) === null || _c === void 0 ? void 0 : _c.balanceUSD) || 0,
            FUTURES: ((_d = walletsByType.FUTURES) === null || _d === void 0 ? void 0 : _d.balanceUSD) || 0
        };
        const todayPnl = await db_1.models.walletPnl.findOne({
            where: {
                userId: user.id,
                createdAt: {
                    [sequelize_1.Op.gte]: today
                }
            }
        });
        if (todayPnl) {
            await todayPnl.update({ balances: todayBalances });
        }
        else {
            await db_1.models.walletPnl.create({
                userId: user.id,
                balances: todayBalances,
                createdAt: today
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Wallet statistics calculated successfully");
        return {
            totalBalance: parseFloat(totalBalanceUSD.toFixed(2)),
            totalChange: parseFloat(totalChange.toFixed(2)),
            totalChangePercent: parseFloat(totalChangePercent.toFixed(2)),
            totalWallets: wallets.length,
            activeWallets,
            walletsByType: Object.fromEntries(Object.entries(walletsByType).map(([type, data]) => [
                type,
                {
                    count: data.count,
                    balance: parseFloat(data.balance.toFixed(8)),
                    balanceUSD: parseFloat(data.balanceUSD.toFixed(2))
                }
            ]))
        };
    }
    catch (error) {
        console_1.logger.error("WALLET", "Error calculating wallet stats", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to calculate wallet statistics"
        });
    }
};
