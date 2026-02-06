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
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const date_fns_1 = require("date-fns");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("@b/api/admin/finance/wallet/utils");
const error_1 = require("@b/utils/error");
const cache_1 = require("@b/utils/cache");
async function getMatchingEngine() {
    try {
        const module = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/matchingEngine")));
        return module.MatchingEngine.getInstance();
    }
    catch (error) {
        return {
            getTickers: async () => ({})
        };
    }
}
exports.metadata = {
    summary: "Lists all wallets with optional filters",
    operationId: "listWallets",
    tags: ["Finance", "Wallets"],
    parameters: [
        ...constants_1.crudParameters,
        {
            name: "pnl",
            in: "query",
            description: "Fetch PnL data for the last 28 days",
            schema: {
                type: "boolean",
            },
        },
    ],
    responses: {
        200: {
            description: "List of wallets with pagination metadata",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.walletSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Wallets"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { query, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { walletType, sortOrder, ...rest } = query;
    const { pnl } = query;
    if (pnl) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating wallet PnL");
        const result = await handlePnl(user);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Wallet PnL calculated successfully");
        return result;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user wallets");
    const cacheManager = cache_1.CacheManager.getInstance();
    const spotWalletsEnabled = await cacheManager.getSetting("spotWallets");
    const isSpotEnabled = spotWalletsEnabled === true || spotWalletsEnabled === "true";
    const where = { userId: user.id };
    if (walletType) {
        where["type"] = walletType;
    }
    else if (!isSpotEnabled) {
        where["type"] = { [sequelize_1.Op.ne]: "SPOT" };
    }
    const { items, pagination } = (await (0, query_1.getFiltered)({
        model: db_1.models.wallet,
        query: {
            ...rest,
            sortOrder: sortOrder || "asc",
        },
        where,
        sortField: rest.sortField || "currency",
        numericFields: ["balance", "inOrder"],
        paranoid: false,
    }));
    const ecoWallets = items.filter((wallet) => wallet.type === "ECO");
    const ecoCurrencies = Array.from(new Set(ecoWallets.map((wallet) => wallet.currency)));
    if (ecoCurrencies.length > 0) {
        const ecosystemTokens = await db_1.models.ecosystemToken.findAll({
            where: { currency: ecoCurrencies },
        });
        const tokenMap = new Map(ecosystemTokens.map((token) => [token.currency, token.icon]));
        ecoWallets.forEach((wallet) => {
            wallet.icon = tokenMap.get(wallet.currency) || null;
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${items.length} wallets`);
    return {
        items,
        pagination,
    };
};
const handlePnl = async (user) => {
    const wallets = await db_1.models.wallet.findAll({
        where: { userId: user.id },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [currencyPrices, exchangePrices] = await Promise.all([
        db_1.models.currency.findAll({
            where: { id: Array.from(new Set(wallets.map((w) => w.currency))) },
        }),
        db_1.models.exchangeCurrency.findAll({
            where: { currency: Array.from(new Set(wallets.map((w) => w.currency))) },
        }),
    ]);
    const currencyMap = new Map(currencyPrices.map((item) => [item.id, item.price]));
    const exchangeMap = new Map(exchangePrices.map((item) => [item.currency, item.price]));
    const engine = await getMatchingEngine();
    const tickers = await engine.getTickers();
    const balances = { FIAT: 0, SPOT: 0, ECO: 0 };
    wallets.forEach((wallet) => {
        var _a;
        let price;
        if (wallet.type === "FIAT") {
            price = currencyMap.get(wallet.currency) || 1;
        }
        else if (wallet.type === "SPOT" || wallet.type === "ECO") {
            price =
                exchangeMap.get(wallet.currency) || ((_a = tickers[wallet.currency]) === null || _a === void 0 ? void 0 : _a.last) || 0;
        }
        if (price) {
            balances[wallet.type] += price * wallet.balance;
        }
    });
    const todayPnl = await db_1.models.walletPnl.findOne({
        where: {
            userId: user.id,
            createdAt: {
                [sequelize_1.Op.gte]: today,
            },
        },
    });
    if (todayPnl) {
        await todayPnl.update({ balances });
    }
    else {
        await db_1.models.walletPnl.create({
            userId: user.id,
            balances,
            createdAt: today,
        });
    }
    const oneMonthAgo = (0, date_fns_1.add)(today, { days: -28 });
    const pnlRecords = await db_1.models.walletPnl.findAll({
        where: {
            userId: user.id,
            createdAt: {
                [sequelize_1.Op.between]: [oneMonthAgo, today],
            },
        },
        attributes: ["balances", "createdAt"],
        order: [["createdAt", "ASC"]],
    });
    const dailyPnl = pnlRecords.reduce((acc, record) => {
        var _a, _b, _c;
        const dateKey = (0, date_fns_1.format)(record.createdAt, "yyyy-MM-dd");
        if (!acc[dateKey]) {
            acc[dateKey] = { FIAT: 0, SPOT: 0, FUNDING: 0 };
        }
        acc[dateKey].FIAT += ((_a = record.balances) === null || _a === void 0 ? void 0 : _a.FIAT) || 0;
        acc[dateKey].SPOT += ((_b = record.balances) === null || _b === void 0 ? void 0 : _b.SPOT) || 0;
        acc[dateKey].FUNDING += ((_c = record.balances) === null || _c === void 0 ? void 0 : _c.ECO) || 0;
        return acc;
    }, {});
    const pnlChart = [];
    const startOfWeek = (0, date_fns_1.add)(oneMonthAgo, { days: -oneMonthAgo.getDay() });
    for (let weekStart = startOfWeek; weekStart < today; weekStart = (0, date_fns_1.add)(weekStart, { weeks: 1 })) {
        const weekEnd = (0, date_fns_1.add)(weekStart, { days: 6 });
        let weeklyFIAT = 0, weeklySPOT = 0, weeklyFUNDING = 0;
        for (let date = weekStart; date <= weekEnd; date = (0, date_fns_1.add)(date, { days: 1 })) {
            const dateKey = (0, date_fns_1.format)(date, "yyyy-MM-dd");
            if (dailyPnl[dateKey]) {
                weeklyFIAT += dailyPnl[dateKey].FIAT;
                weeklySPOT += dailyPnl[dateKey].SPOT;
                weeklyFUNDING += dailyPnl[dateKey].FUNDING;
            }
        }
        pnlChart.push({
            date: (0, date_fns_1.format)(weekStart, "yyyy-MM-dd"),
            FIAT: weeklyFIAT,
            SPOT: weeklySPOT,
            FUNDING: weeklyFUNDING,
        });
    }
    const yesterday = (0, date_fns_1.add)(today, { days: -1 });
    const yesterdayPnlRecord = pnlRecords.find((record) => (0, date_fns_1.format)(record.createdAt, "yyyy-MM-dd") ===
        (0, date_fns_1.format)(yesterday, "yyyy-MM-dd"));
    const calculatePnl = (today, yesterday) => {
        const pnl = today - yesterday;
        const transfers = 0;
        const withdrawals = 0;
        return pnl - transfers - withdrawals;
    };
    const todayTotal = sumBalances(balances);
    const yesterdayTotal = (yesterdayPnlRecord === null || yesterdayPnlRecord === void 0 ? void 0 : yesterdayPnlRecord.balances)
        ? sumBalances(yesterdayPnlRecord.balances)
        : 0;
    return {
        today: todayTotal,
        yesterday: yesterdayTotal,
        pnl: calculatePnl(todayTotal, yesterdayTotal),
        chart: pnlChart,
    };
};
const sumBalances = (balances) => {
    return Object.values(balances).reduce((acc, balance) => acc + balance, 0);
};
