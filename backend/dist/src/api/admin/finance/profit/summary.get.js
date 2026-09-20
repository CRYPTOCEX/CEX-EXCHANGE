"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const fees_1 = require("@b/utils/fees");
exports.metadata = {
    summary: "Get Admin Profit Summary",
    operationId: "getAdminProfitSummary",
    tags: ["Admin", "Finance", "Profits"],
    responses: {
        200: {
            description: "Admin profit summary with wallet balances and aggregations",
        },
    },
    requiresAuth: true,
    permission: "view.admin.profit",
};
const emptyResult = {
    totalsByWalletType: {},
    totalsByType: {},
    totalsByCurrency: {},
    recentFees: [],
    periodComparison: { today: {}, thisWeek: {}, thisMonth: {}, lastMonth: {} },
    trackingSince: null,
    pendingOnchainRevenue: [],
};
exports.default = async (data) => {
    const superAdmin = await (0, fees_1.getSuperAdmin)();
    if (!superAdmin) {
        return emptyResult;
    }
    const adminWallets = await db_1.models.wallet.findAll({
        where: { userId: superAdmin.id },
        attributes: ["id", "type", "currency", "balance", "inOrder"],
        raw: true,
    });
    const totalsByWalletType = {};
    for (const w of adminWallets) {
        if (!totalsByWalletType[w.type]) {
            totalsByWalletType[w.type] = {};
        }
        const balance = parseFloat(w.balance || "0");
        const inOrder = parseFloat(w.inOrder || "0");
        totalsByWalletType[w.type][w.currency] = {
            total: balance + inOrder,
            walletId: w.id,
            walletBalance: balance,
            available: Math.max(0, balance),
        };
    }
    const profitByType = await db_1.models.adminProfit.findAll({
        attributes: ["type", [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"], [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
        group: ["type"],
        raw: true,
    });
    const totalsByType = {};
    for (const row of profitByType) {
        totalsByType[row.type] = {
            total: parseFloat(row.total || "0"),
            count: parseInt(row.count || "0"),
        };
    }
    const profitByCurrency = await db_1.models.adminProfit.findAll({
        attributes: [
            "currency",
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"],
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
        ],
        group: ["currency"],
        order: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "DESC"]],
        raw: true,
    });
    const totalsByCurrency = {};
    for (const row of profitByCurrency) {
        totalsByCurrency[row.currency] = {
            total: parseFloat(row.total || "0"),
            count: parseInt(row.count || "0"),
        };
    }
    const recentFees = await db_1.models.adminProfit.findAll({
        order: [["createdAt", "DESC"]],
        limit: 20,
        raw: true,
    });
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodWindows = [
        { key: "today", where: { createdAt: { [sequelize_1.Op.gte]: startOfToday } } },
        { key: "thisWeek", where: { createdAt: { [sequelize_1.Op.gte]: startOfWeek } } },
        { key: "thisMonth", where: { createdAt: { [sequelize_1.Op.gte]: startOfMonth } } },
        {
            key: "lastMonth",
            where: {
                createdAt: { [sequelize_1.Op.gte]: startOfLastMonth, [sequelize_1.Op.lt]: startOfMonth },
            },
        },
    ];
    const periodRows = await Promise.all(periodWindows.map((w) => db_1.models.adminProfit.findAll({
        attributes: ["currency", [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"]],
        where: w.where,
        group: ["currency"],
        raw: true,
    })));
    const periodByCurrency = {};
    periodWindows.forEach((w, i) => {
        const byCurrency = {};
        for (const row of periodRows[i]) {
            const total = parseFloat(row.total || "0");
            if (Number.isFinite(total) && total !== 0) {
                byCurrency[row.currency] = total;
            }
        }
        periodByCurrency[w.key] = byCurrency;
    });
    const pendingOnchainRevenue = db_1.models.dexFeeAccrual
        ? (await db_1.models.dexFeeAccrual.findAll({
            attributes: [
                "tokenSymbol",
                "chainId",
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amountDisplay")), "total"],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amountUsd")), "totalUsd"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("*")), "count"],
            ],
            where: { sweepStatus: { [sequelize_1.Op.in]: ["ACCRUED", "SWEEP_SUBMITTED"] } },
            group: ["tokenSymbol", "chainId"],
            raw: true,
        }))
        : [];
    const pendingOnchain = pendingOnchainRevenue.map((row) => ({
        tokenSymbol: row.tokenSymbol,
        chainId: Number(row.chainId),
        total: parseFloat(row.total || "0"),
        totalUsd: row.totalUsd === null ? null : parseFloat(row.totalUsd),
        count: parseInt(row.count || "0", 10),
    }));
    const earliestRecord = await db_1.models.adminProfit.findOne({
        attributes: ["createdAt"],
        order: [["createdAt", "ASC"]],
        raw: true,
    });
    return {
        totalsByWalletType,
        totalsByType,
        totalsByCurrency,
        recentFees,
        periodComparison: periodByCurrency,
        trackingSince: (earliestRecord === null || earliestRecord === void 0 ? void 0 : earliestRecord.createdAt) || null,
        adminId: superAdmin.id,
        pendingOnchainRevenue: pendingOnchain,
    };
};
