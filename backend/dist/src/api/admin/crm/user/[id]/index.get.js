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
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
const cache_1 = require("@b/utils/cache");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
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
const getExtensionData = async (userId, extensions) => {
    var _a, _b, _c, _d, _e, _f;
    const extensionData = {};
    try {
        const binaryOrders = await db_1.models.binaryOrder.findAll({
            where: { userId },
            attributes: ["id", "symbol", "amount", "profit", "side", "status", "isDemo", "createdAt"],
            limit: 10,
            order: [["createdAt", "DESC"]],
        });
        const binaryStats = await db_1.models.binaryOrder.findOne({
            where: { userId },
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalTrades"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'WIN' THEN 1 ELSE 0 END")), "winCount"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'LOSS' THEN 1 ELSE 0 END")), "lossCount"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("profit")), "totalProfit"],
            ],
            raw: true,
        });
        extensionData.binaryData = {
            recentOrders: binaryOrders,
            stats: binaryStats,
        };
        const spotOrders = await db_1.models.exchangeOrder.findAll({
            where: { userId },
            attributes: ["id", "symbol", "type", "side", "amount", "price", "filled", "status", "createdAt"],
            limit: 10,
            order: [["createdAt", "DESC"]],
        });
        extensionData.spotData = {
            recentOrders: spotOrders,
        };
        if (extensions.has("forex")) {
            const forexTransactions = await db_1.models.transaction.findAll({
                where: {
                    userId,
                    type: {
                        [sequelize_1.Op.in]: ["FOREX_DEPOSIT", "FOREX_WITHDRAW"]
                    }
                },
                include: [
                    {
                        model: db_1.models.wallet,
                        as: "wallet",
                        attributes: ["currency", "type"],
                    },
                ],
                attributes: ["id", "type", "amount", "status", "description", "createdAt"],
                limit: 20,
                order: [["createdAt", "DESC"]],
            });
            const forexInvestments = await ((_a = db_1.models.forexInvestment) === null || _a === void 0 ? void 0 : _a.findAll({
                where: { userId },
                include: [
                    {
                        model: db_1.models.forexPlan,
                        as: "plan",
                        attributes: ["name", "title", "currency", "walletType"],
                    },
                    {
                        model: db_1.models.forexDuration,
                        as: "duration",
                        attributes: ["duration", "timeframe"],
                    },
                ],
                attributes: ["id", "amount", "profit", "result", "status", "endDate", "createdAt"],
                limit: 10,
                order: [["createdAt", "DESC"]],
            })) || [];
            const deposits = forexTransactions.filter(t => t.type === "FOREX_DEPOSIT");
            const withdrawals = forexTransactions.filter(t => t.type === "FOREX_WITHDRAW");
            extensionData.forexData = {
                deposits,
                withdrawals,
                investments: forexInvestments,
            };
        }
        if (extensions.has("futures")) {
            try {
                const scyllaQueriesPath = "@b/api/(ext)/ecosystem/utils/scylla/queries";
                const { query } = await Promise.resolve(`${scyllaQueriesPath}`).then(s => __importStar(require(s)));
                const scyllaFuturesKeyspace = process.env.SCYLLA_FUTURES_KEYSPACE || "futures";
                const futuresOrdersResult = await query(`SELECT * FROM ${scyllaFuturesKeyspace}.orders WHERE "userId" = ? ORDER BY "createdAt" DESC LIMIT 10`, [userId]);
                const futuresPositionsResult = await query(`SELECT * FROM ${scyllaFuturesKeyspace}.position WHERE "userId" = ? LIMIT 10`, [userId]);
                extensionData.futuresData = {
                    recentOrders: futuresOrdersResult.rows || [],
                    positions: futuresPositionsResult.rows || [],
                };
            }
            catch (error) {
                console_1.logger.warn("FUTURES", `Failed to fetch futures data from ScyllaDB: ${error.message}`);
                extensionData.futuresData = {
                    recentOrders: [],
                    positions: [],
                };
            }
        }
        if (extensions.has("ecosystem")) {
            try {
                const scyllaQueriesPath = "@b/api/(ext)/ecosystem/utils/scylla/queries";
                const { query } = await Promise.resolve(`${scyllaQueriesPath}`).then(s => __importStar(require(s)));
                const scyllaKeyspace = process.env.SCYLLA_KEYSPACE || "trading";
                const ecosystemOrdersResult = await query(`SELECT * FROM ${scyllaKeyspace}.orders WHERE "userId" = ? ORDER BY "createdAt" DESC LIMIT 10`, [userId]);
                extensionData.ecosystemData = {
                    recentOrders: ecosystemOrdersResult.rows || [],
                };
            }
            catch (error) {
                console_1.logger.warn("ECOSYSTEM", `Failed to fetch ecosystem data from ScyllaDB: ${error.message}`);
                extensionData.ecosystemData = {
                    recentOrders: [],
                };
            }
        }
        if (extensions.has("ai_investment")) {
            const aiInvestments = await ((_b = db_1.models.aiInvestment) === null || _b === void 0 ? void 0 : _b.findAll({
                where: { userId },
                include: [
                    {
                        model: db_1.models.aiInvestmentPlan,
                        as: "plan",
                        attributes: ["name", "title"],
                    },
                    {
                        model: db_1.models.aiInvestmentDuration,
                        as: "duration",
                        attributes: ["duration", "timeframe"],
                    },
                ],
                attributes: ["id", "amount", "profit", "result", "status", "createdAt"],
                limit: 10,
                order: [["createdAt", "DESC"]],
            })) || [];
            extensionData.aiData = {
                investments: aiInvestments,
            };
        }
        if (extensions.has("ico")) {
            const icoContributions = await ((_c = db_1.models.icoTransaction) === null || _c === void 0 ? void 0 : _c.findAll({
                where: { userId },
                include: [
                    {
                        model: db_1.models.icoTokenOffering,
                        as: "offering",
                        attributes: ["name", "symbol", "status"],
                    },
                ],
                attributes: ["id", "amount", "price", "status", "createdAt"],
                limit: 10,
                order: [["createdAt", "DESC"]],
            })) || [];
            extensionData.icoData = {
                contributions: icoContributions,
            };
        }
        if (extensions.has("p2p")) {
            const p2pOffers = await ((_d = db_1.models.p2pOffer) === null || _d === void 0 ? void 0 : _d.findAll({
                where: { userId },
                attributes: ["id", "type", "currency", "status", "views", "createdAt"],
                limit: 10,
                order: [["createdAt", "DESC"]],
            })) || [];
            const p2pTrades = await ((_e = db_1.models.p2pTrade) === null || _e === void 0 ? void 0 : _e.findAll({
                where: {
                    [sequelize_1.Op.or]: [
                        { sellerId: userId },
                        { buyerId: userId }
                    ]
                },
                attributes: ["id", "amount", "price", "status", "createdAt"],
                limit: 10,
                order: [["createdAt", "DESC"]],
            })) || [];
            extensionData.p2pData = {
                offers: p2pOffers,
                trades: p2pTrades,
            };
        }
        if (extensions.has("staking")) {
            const stakingLogs = await ((_f = db_1.models.stakingPosition) === null || _f === void 0 ? void 0 : _f.findAll({
                where: { userId },
                include: [
                    {
                        model: db_1.models.stakingPool,
                        as: "pool",
                        attributes: ["name", "symbol", "apr"],
                    },
                ],
                attributes: ["id", "amount", "status", "startDate", "endDate", "createdAt"],
                limit: 10,
                order: [["createdAt", "DESC"]],
            })) || [];
            extensionData.stakingData = {
                logs: stakingLogs,
            };
        }
    }
    catch (error) {
        console_1.logger.error("USER", "Error fetching extension data", error);
    }
    return extensionData;
};
exports.default = async (data) => {
    const { params } = data;
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
        },
        {
            model: db_1.models.twoFactor,
            as: "twoFactor",
            required: false,
            attributes: ["id", "enabled", "type", "createdAt"],
        },
        {
            model: db_1.models.notification,
            as: "notifications",
            required: false,
            attributes: ["id", "type", "title", "message", "read", "createdAt"],
        },
    ], [
        "password",
        "metadata",
    ]);
    if (user) {
        const isSequelizeModel = typeof user.get === 'function';
        const userData = isSequelizeModel ? user.get({ plain: true }) : user;
        const extensionData = await getExtensionData(userData.id, extensions);
        Object.assign(userData, extensionData);
        return userData;
    }
    return null;
};
