"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
const cache_1 = require("@b/utils/cache");
const kyc_1 = require("@b/utils/kyc");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const system_accounts_1 = require("@b/utils/system-accounts");
exports.metadata = {
    summary: "Retrieves detailed information of a specific user by UUID with extension data",
    operationId: "getUserByUuid",
    tags: ["Admin", "CRM", "User"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the user to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "User details with extension data",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.userSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("User"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.user",
    demoMask: ["email", "phone"],
};
const collectAddon = async (label, build) => {
    var _a;
    try {
        return await build();
    }
    catch (error) {
        console_1.logger.warn("USER", `Failed to collect ${label} data for the user profile: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        return null;
    }
};
const getSupportStats = async (userId) => {
    const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [total, recent, resolved, highImportanceOpen] = await Promise.all([
        db_1.models.supportTicket.count({ where: { userId } }),
        db_1.models.supportTicket.count({
            where: { userId, createdAt: { [sequelize_1.Op.gte]: THIRTY_DAYS_AGO } },
        }),
        db_1.models.supportTicket.count({ where: { userId, status: "CLOSED" } }),
        db_1.models.supportTicket.count({
            where: {
                userId,
                importance: "HIGH",
                status: { [sequelize_1.Op.ne]: "CLOSED" },
            },
        }),
    ]);
    return { total, recent, resolved, highImportanceOpen };
};
const getAddonSummaries = async (userId, extensions) => {
    const summaries = {};
    const num = (value) => Number(value !== null && value !== void 0 ? value : 0) || 0;
    summaries.binary = await collectAddon("binary", async () => {
        const stats = await db_1.models.binaryOrder.findOne({
            where: { userId },
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalTrades"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'WIN' THEN 1 ELSE 0 END")), "winCount"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'LOSS' THEN 1 ELSE 0 END")), "lossCount"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "totalProfit"],
            ],
            raw: true,
        });
        const totalTrades = num(stats === null || stats === void 0 ? void 0 : stats.totalTrades);
        const wins = num(stats === null || stats === void 0 ? void 0 : stats.winCount);
        return {
            totalTrades,
            wins,
            losses: num(stats === null || stats === void 0 ? void 0 : stats.lossCount),
            totalProfit: num(stats === null || stats === void 0 ? void 0 : stats.totalProfit),
            winRate: totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0,
        };
    });
    summaries.spot = await collectAddon("spot", async () => {
        const stats = await db_1.models.exchangeOrder.findOne({
            where: { userId },
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalOrders"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END")), "openOrders"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalAmount"],
            ],
            raw: true,
        });
        return {
            totalOrders: num(stats === null || stats === void 0 ? void 0 : stats.totalOrders),
            openOrders: num(stats === null || stats === void 0 ? void 0 : stats.openOrders),
            totalAmount: num(stats === null || stats === void 0 ? void 0 : stats.totalAmount),
        };
    });
    if (extensions.has("forex")) {
        summaries.forex = await collectAddon("forex", async () => {
            var _a;
            const [deposits, withdrawals, investmentStats] = await Promise.all([
                db_1.models.transaction.count({ where: { userId, type: "FOREX_DEPOSIT" } }),
                db_1.models.transaction.count({ where: { userId, type: "FOREX_WITHDRAW" } }),
                (_a = db_1.models.forexInvestment) === null || _a === void 0 ? void 0 : _a.findOne({
                    where: { userId },
                    attributes: [
                        [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
                        [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "invested"],
                        [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "profit"],
                    ],
                    raw: true,
                }),
            ]);
            return {
                deposits: num(deposits),
                withdrawals: num(withdrawals),
                investments: num(investmentStats === null || investmentStats === void 0 ? void 0 : investmentStats.count),
                invested: num(investmentStats === null || investmentStats === void 0 ? void 0 : investmentStats.invested),
                profit: num(investmentStats === null || investmentStats === void 0 ? void 0 : investmentStats.profit),
            };
        });
    }
    if (extensions.has("ai_investment")) {
        summaries.ai = await collectAddon("ai_investment", async () => {
            var _a;
            const stats = await ((_a = db_1.models.aiInvestment) === null || _a === void 0 ? void 0 : _a.findOne({
                where: { userId },
                attributes: [
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END")), "active"],
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "invested"],
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "profit"],
                ],
                raw: true,
            }));
            return {
                investments: num(stats === null || stats === void 0 ? void 0 : stats.count),
                active: num(stats === null || stats === void 0 ? void 0 : stats.active),
                invested: num(stats === null || stats === void 0 ? void 0 : stats.invested),
                profit: num(stats === null || stats === void 0 ? void 0 : stats.profit),
            };
        });
    }
    if (extensions.has("ico")) {
        summaries.ico = await collectAddon("ico", async () => {
            var _a;
            const stats = await ((_a = db_1.models.icoTransaction) === null || _a === void 0 ? void 0 : _a.findOne({
                where: { userId },
                attributes: [
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("amount * price")), "contributed"],
                ],
                raw: true,
            }));
            return {
                contributions: num(stats === null || stats === void 0 ? void 0 : stats.count),
                contributed: num(stats === null || stats === void 0 ? void 0 : stats.contributed),
            };
        });
    }
    if (extensions.has("p2p")) {
        summaries.p2p = await collectAddon("p2p", async () => {
            var _a, _b, _c;
            var _d, _e, _f;
            const [offers, trades, completedTrades] = await Promise.all([
                (_d = (_a = db_1.models.p2pOffer) === null || _a === void 0 ? void 0 : _a.count({ where: { userId } })) !== null && _d !== void 0 ? _d : 0,
                (_e = (_b = db_1.models.p2pTrade) === null || _b === void 0 ? void 0 : _b.count({
                    where: { [sequelize_1.Op.or]: [{ buyerId: userId }, { sellerId: userId }] },
                })) !== null && _e !== void 0 ? _e : 0,
                (_f = (_c = db_1.models.p2pTrade) === null || _c === void 0 ? void 0 : _c.count({
                    where: {
                        status: "COMPLETED",
                        [sequelize_1.Op.or]: [{ buyerId: userId }, { sellerId: userId }],
                    },
                })) !== null && _f !== void 0 ? _f : 0,
            ]);
            return { offers: num(offers), trades: num(trades), completedTrades: num(completedTrades) };
        });
    }
    if (extensions.has("staking")) {
        summaries.staking = await collectAddon("staking", async () => {
            var _a;
            const stats = await ((_a = db_1.models.stakingPosition) === null || _a === void 0 ? void 0 : _a.findOne({
                where: { userId },
                attributes: [
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END")), "active"],
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "staked"],
                ],
                raw: true,
            }));
            return {
                positions: num(stats === null || stats === void 0 ? void 0 : stats.count),
                active: num(stats === null || stats === void 0 ? void 0 : stats.active),
                staked: num(stats === null || stats === void 0 ? void 0 : stats.staked),
            };
        });
    }
    if (extensions.has("ecommerce")) {
        summaries.ecommerce = await collectAddon("ecommerce", async () => {
            var _a;
            const orders = await ((_a = db_1.models.ecommerceOrder) === null || _a === void 0 ? void 0 : _a.count({ where: { userId } }));
            return { orders: num(orders) };
        });
    }
    if (extensions.has("mlm")) {
        summaries.affiliate = await collectAddon("mlm", async () => {
            var _a, _b;
            var _c, _d;
            const [referred, referredBy] = await Promise.all([
                (_c = (_a = db_1.models.mlmReferral) === null || _a === void 0 ? void 0 : _a.count({ where: { referrerId: userId } })) !== null && _c !== void 0 ? _c : 0,
                (_d = (_b = db_1.models.mlmReferral) === null || _b === void 0 ? void 0 : _b.count({ where: { referredId: userId } })) !== null && _d !== void 0 ? _d : 0,
            ]);
            return { referred: num(referred), referredBy: num(referredBy) };
        });
    }
    if (extensions.has("nft")) {
        summaries.nft = await collectAddon("nft", async () => {
            var _a, _b, _c, _d;
            var _e, _f, _g, _h;
            const [owned, listings, sold, bought] = await Promise.all([
                (_e = (_a = db_1.models.nftToken) === null || _a === void 0 ? void 0 : _a.count({ where: { ownerId: userId } })) !== null && _e !== void 0 ? _e : 0,
                (_f = (_b = db_1.models.nftListing) === null || _b === void 0 ? void 0 : _b.count({ where: { sellerId: userId } })) !== null && _f !== void 0 ? _f : 0,
                (_g = (_c = db_1.models.nftSale) === null || _c === void 0 ? void 0 : _c.count({ where: { sellerId: userId } })) !== null && _g !== void 0 ? _g : 0,
                (_h = (_d = db_1.models.nftSale) === null || _d === void 0 ? void 0 : _d.count({ where: { buyerId: userId } })) !== null && _h !== void 0 ? _h : 0,
            ]);
            return { owned: num(owned), listings: num(listings), sold: num(sold), bought: num(bought) };
        });
    }
    if (extensions.has("forex_trading")) {
        summaries.fxdesk = await collectAddon("forex_trading", async () => {
            var _a, _b, _c;
            var _d, _e;
            const accounts = await ((_a = db_1.models.fxAccount) === null || _a === void 0 ? void 0 : _a.findAll({
                where: { userId },
                attributes: ["id"],
                raw: true,
            }));
            const accountIds = (accounts !== null && accounts !== void 0 ? accounts : []).map((a) => a.id);
            if (!accountIds.length)
                return { accounts: 0, openPositions: 0, deals: 0 };
            const [openPositions, deals] = await Promise.all([
                (_d = (_b = db_1.models.fxPosition) === null || _b === void 0 ? void 0 : _b.count({
                    where: { accountId: { [sequelize_1.Op.in]: accountIds }, status: "OPEN" },
                })) !== null && _d !== void 0 ? _d : 0,
                (_e = (_c = db_1.models.fxDeal) === null || _c === void 0 ? void 0 : _c.count({ where: { accountId: { [sequelize_1.Op.in]: accountIds } } })) !== null && _e !== void 0 ? _e : 0,
            ]);
            return {
                accounts: accountIds.length,
                openPositions: num(openPositions),
                deals: num(deals),
            };
        });
    }
    if (extensions.has("copy_trading")) {
        summaries.copytrading = await collectAddon("copy_trading", async () => {
            var _a, _b;
            var _c, _d;
            const [asLeader, asFollower] = await Promise.all([
                (_c = (_a = db_1.models.copyTradingLeader) === null || _a === void 0 ? void 0 : _a.count({ where: { userId } })) !== null && _c !== void 0 ? _c : 0,
                (_d = (_b = db_1.models.copyTradingFollower) === null || _b === void 0 ? void 0 : _b.count({ where: { userId } })) !== null && _d !== void 0 ? _d : 0,
            ]);
            return { asLeader: num(asLeader), asFollower: num(asFollower) };
        });
    }
    if (extensions.has("trading_bot")) {
        summaries.tradingbot = await collectAddon("trading_bot", async () => {
            var _a, _b;
            var _c, _d;
            const [bots, running] = await Promise.all([
                (_c = (_a = db_1.models.tradingBot) === null || _a === void 0 ? void 0 : _a.count({ where: { userId } })) !== null && _c !== void 0 ? _c : 0,
                (_d = (_b = db_1.models.tradingBot) === null || _b === void 0 ? void 0 : _b.count({ where: { userId, status: "ACTIVE" } })) !== null && _d !== void 0 ? _d : 0,
            ]);
            return { bots: num(bots), running: num(running) };
        });
    }
    return summaries;
};
exports.default = async (data) => {
    const { params, user: caller } = data;
    await (0, utils_1.assertCanAccessUser)(caller === null || caller === void 0 ? void 0 : caller.id, params.id);
    const cacheManager = cache_1.CacheManager.getInstance();
    const extensions = await cacheManager.getExtensions();
    const user = await (0, query_1.getRecord)("user", params.id, [
        {
            model: db_1.models.role,
            as: "role",
            attributes: ["id", "name"],
        },
        {
            model: db_1.models.kycApplication,
            as: "kycApplications",
            required: false,
            attributes: ["id", "status", "reviewedAt", "createdAt", "data", "adminNotes"],
            includeModels: [
                {
                    model: db_1.models.kycLevel,
                    as: "level",
                    required: false,
                    paranoid: false,
                    attributes: ["id", "name", "level", "features"],
                },
            ],
        },
        {
            model: db_1.models.twoFactor,
            as: "twoFactor",
            required: false,
            attributes: ["id", "enabled", "type", "createdAt"],
        },
        {
            model: db_1.models.transferPin,
            as: "transferPin",
            required: false,
            attributes: [
                "id",
                "enabled",
                "failedAttempts",
                "lockoutCount",
                "lockedUntil",
                "lastChangedAt",
            ],
        },
    ], [
        "password",
        "metadata",
    ]);
    if (user) {
        const isSequelizeModel = typeof user.get === 'function';
        const userData = isSequelizeModel ? user.get({ plain: true }) : user;
        const [addonSummary, supportStats, notifications] = await Promise.all([
            getAddonSummaries(userData.id, extensions),
            collectAddon("support", () => getSupportStats(userData.id)),
            collectAddon("notifications", () => db_1.models.notification.findAll({
                where: { userId: userData.id },
                attributes: ["id", "type", "title", "message", "read", "createdAt"],
                limit: 20,
                order: [["createdAt", "DESC"]],
            })),
        ]);
        userData.addonSummary = addonSummary;
        userData.supportStats = supportStats;
        userData.notifications = notifications !== null && notifications !== void 0 ? notifications : [];
        userData.system = (0, system_accounts_1.isSystemAccountId)(userData.id);
        const kycApplications = userData.kycApplications || [];
        const effectiveKyc = (0, kyc_1.getEffectiveKycStatus)(kycApplications);
        const effectiveApp = effectiveKyc.effectiveApplication ||
            (kycApplications.length > 0
                ? kycApplications[kycApplications.length - 1]
                : null);
        userData.kyc = effectiveApp
            ? {
                id: effectiveApp.id,
                status: effectiveApp.status,
                createdAt: effectiveApp.createdAt,
                reviewedAt: effectiveApp.reviewedAt,
                adminNotes: effectiveApp.adminNotes,
                data: effectiveApp.data,
                level: effectiveApp.level || null,
                kycLevel: effectiveKyc.level,
                features: effectiveKyc.features,
                isVerified: effectiveKyc.isVerified,
            }
            : null;
        return userData;
    }
    return null;
};
