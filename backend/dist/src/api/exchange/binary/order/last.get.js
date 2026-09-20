"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const date_fns_1 = require("date-fns");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "List Binary Orders from Last 30 Days",
    operationId: "listBinaryOrdersLast30Days",
    tags: ["Binary", "Orders"],
    description: "Retrieves the non-pending binary orders for practice and non-practice accounts from the last 30 days and compares them with the previous month.",
    logModule: "EXCHANGE",
    logTitle: "Get Last 30 Days Binary Orders",
    responses: {
        200: {
            description: "A list of binary orders from the last 30 days",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            practiceOrders: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {},
                                },
                            },
                            nonPracticeOrders: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {},
                                },
                            },
                            livePercentageChange: { type: "number" },
                            practicePercentageChange: { type: "number" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Order"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching binary orders for last 30 days");
        const thirtyDaysAgo = (0, date_fns_1.subDays)(new Date(), 30);
        const sixtyDaysAgo = (0, date_fns_1.subDays)(new Date(), 60);
        const allOrdersLast30Days = await db_1.models.binaryOrder.findAll({
            where: {
                userId: user.id,
                status: { [sequelize_1.Op.not]: "PENDING" },
                createdAt: { [sequelize_1.Op.gte]: thirtyDaysAgo },
            },
            order: [["createdAt", "DESC"]],
        });
        const allOrdersLast60Days = await db_1.models.binaryOrder.findAll({
            where: {
                userId: user.id,
                status: { [sequelize_1.Op.not]: "PENDING" },
                createdAt: { [sequelize_1.Op.between]: [sixtyDaysAgo, thirtyDaysAgo] },
            },
            order: [["createdAt", "DESC"]],
        });
        const practiceOrdersLast30Days = allOrdersLast30Days.filter((order) => order.isDemo);
        const liveOrdersLast30Days = allOrdersLast30Days.filter((order) => !order.isDemo);
        const practiceOrdersLast60Days = allOrdersLast60Days.filter((order) => order.isDemo);
        const liveOrdersLast60Days = allOrdersLast60Days.filter((order) => !order.isDemo);
        const calculatePercentageChange = (current, previous) => {
            if (previous === 0)
                return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };
        const livePercentageChange = calculatePercentageChange(liveOrdersLast30Days.length, liveOrdersLast60Days.length);
        const practicePercentageChange = calculatePercentageChange(practiceOrdersLast30Days.length, practiceOrdersLast60Days.length);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${allOrdersLast30Days.length} orders (${practiceOrdersLast30Days.length} practice, ${liveOrdersLast30Days.length} live)`);
        return {
            practiceOrders: practiceOrdersLast30Days,
            nonPracticeOrders: liveOrdersLast30Days,
            livePercentageChange,
            practicePercentageChange,
        };
    }
    catch (error) {
        console.error("Error :", error);
        return {
            status: 500,
            body: {
                message: "Internal Server Error",
                error: error.message,
            },
        };
    }
};
