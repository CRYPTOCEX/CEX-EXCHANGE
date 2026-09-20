"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Submit Trade Review",
    description: "Submits a review for a trade with rating and feedback.",
    operationId: "reviewP2PTrade",
    tags: ["P2P", "Trade"],
    requiresAuth: true,
    logModule: "P2P_REVIEW",
    logTitle: "Submit review",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Trade ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "Review data",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        rating: { type: "number" },
                        feedback: { type: "string" },
                    },
                    required: ["rating", "feedback"],
                },
            },
        },
    },
    responses: {
        200: { description: "Review submitted successfully." },
        401: { description: "Unauthorized." },
        404: { description: "Trade not found." },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    const { id } = data.params || {};
    const { rating, feedback } = data.body;
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding trade and validating review");
    const trade = await db_1.models.p2pTrade.findOne({
        where: {
            id,
            [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        },
    });
    if (!trade) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Trade not found" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating review record");
        await db_1.models.p2pReview.create({ reviewerId: user.id, revieweeId: trade.sellerId, tradeId: id, comment: feedback });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Submitted review for trade ${trade.id.slice(0, 8)}... (rating: ${rating})`);
        return { message: "Review submitted successfully." };
    }
    catch (err) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
