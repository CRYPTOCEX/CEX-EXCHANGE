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
    if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 1 || rating > 5) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Rating must be a number between 1 and 5" });
    }
    const { sanitizeInput } = await Promise.resolve().then(() => __importStar(require("../../utils/validation")));
    const sanitizedFeedback = feedback ? sanitizeInput(feedback) : "";
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
    if (!["COMPLETED"].includes(trade.status)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Reviews can only be submitted for completed trades"
        });
    }
    const existingReview = await db_1.models.p2pReview.findOne({
        where: { reviewerId: user.id, tradeId: id },
    });
    if (existingReview) {
        throw (0, error_1.createError)({ statusCode: 409, message: "You have already reviewed this trade" });
    }
    const revieweeId = user.id === trade.buyerId ? trade.sellerId : trade.buyerId;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating review record");
        await db_1.models.p2pReview.create({
            reviewerId: user.id,
            revieweeId,
            tradeId: id,
            rating,
            comment: sanitizedFeedback,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Submitted review for trade ${trade.id.slice(0, 8)}... (rating: ${rating})`);
        return { message: "Review submitted successfully." };
    }
    catch (err) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to submit review: " + err.message,
        });
    }
};
