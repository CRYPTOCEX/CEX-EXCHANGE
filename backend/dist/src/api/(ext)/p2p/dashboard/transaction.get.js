"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get P2P Transactions",
    description: "Retrieves recent trade transactions for the authenticated user.",
    operationId: "getP2PTransactions",
    tags: ["P2P", "Dashboard"],
    logModule: "P2P",
    logTitle: "Get transactions",
    responses: {
        200: { description: "Transactions retrieved successfully." },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching recent transactions");
    try {
        const transactions = await db_1.models.p2pTrade.findAll({
            where: {
                [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
            },
            order: [["createdAt", "DESC"]],
            limit: 10,
            raw: true,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${transactions.length} transactions`);
        return transactions;
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to retrieve transactions");
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error: " + err.message });
    }
};
