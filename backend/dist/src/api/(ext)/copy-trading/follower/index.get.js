"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/currency/utils");
const stats_calculator_1 = require("@b/api/(ext)/copy-trading/utils/stats-calculator");
exports.metadata = {
    summary: "Get My Copy Trading Subscriptions",
    description: "Retrieves all leaders the current user is following.",
    operationId: "getMyCopyTradingSubscriptions",
    tags: ["Copy Trading", "Followers"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Get my subscriptions",
    parameters: [
        {
            name: "status",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["ACTIVE", "PAUSED", "STOPPED"] },
            description: "Filter by subscription status",
        },
    ],
    responses: {
        200: {
            description: "Subscriptions retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: { type: "object" },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching subscriptions");
    const whereClause = { userId: user.id };
    if (query.status) {
        whereClause.status = query.status;
    }
    else {
        whereClause.status = { [sequelize_1.Op.ne]: "STOPPED" };
    }
    const subscriptions = await db_1.models.copyTradingFollower.findAll({
        where: whereClause,
        include: [
            {
                model: db_1.models.copyTradingLeader,
                as: "leader",
                include: [
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                ],
            },
            {
                model: db_1.models.copyTradingFollowerAllocation,
                as: "allocations",
            },
        ],
        order: [["createdAt", "DESC"]],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating stats and USDT totals for each subscription");
    const subscriptionsWithTotals = await Promise.all(subscriptions.map(async (s) => {
        const subData = s.toJSON();
        let totalAllocatedUSDT = 0;
        if (subData.allocations && subData.allocations.length > 0) {
            for (const alloc of subData.allocations) {
                if (!alloc.isActive)
                    continue;
                try {
                    const [baseCurrency, quoteCurrency] = alloc.symbol.split("/");
                    const basePrice = await (0, utils_1.getEcoPriceInUSD)(baseCurrency);
                    const baseInUSDT = parseFloat(alloc.baseAmount || 0) * basePrice;
                    const quotePrice = await (0, utils_1.getEcoPriceInUSD)(quoteCurrency);
                    const quoteInUSDT = parseFloat(alloc.quoteAmount || 0) * quotePrice;
                    totalAllocatedUSDT += baseInUSDT + quoteInUSDT;
                }
                catch (error) {
                    console.error(`Failed to get price for ${alloc.symbol}:`, error);
                }
            }
        }
        const stats = await (0, stats_calculator_1.getFollowerStats)(subData.id);
        return {
            ...subData,
            totalAllocatedUSDT: Math.round(totalAllocatedUSDT * 100) / 100,
            ...stats,
        };
    }));
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Found ${subscriptions.length} subscriptions`);
    return subscriptionsWithTotals;
};
