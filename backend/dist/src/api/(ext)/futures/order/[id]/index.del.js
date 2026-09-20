"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("@b/api/finance/wallet/utils");
const matchingEngine_1 = require("@b/api/(ext)/futures/utils/matchingEngine");
let fromBigInt;
let updateWalletBalance;
try {
    const blockchainModule = require("@b/api/(ext)/ecosystem/utils/blockchain");
    fromBigInt = blockchainModule.fromBigInt;
}
catch (e) {
}
try {
    const walletModule = require("@b/api/(ext)/ecosystem/utils/wallet");
    updateWalletBalance = walletModule.updateWalletBalance;
}
catch (e) {
}
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const order_1 = require("@b/api/(ext)/futures/utils/queries/order");
exports.metadata = {
    summary: "Cancels an existing futures trading order",
    description: "Cancels an open futures trading order and refunds the unfulfilled amount.",
    operationId: "cancelFuturesOrder",
    tags: ["Futures", "Orders"],
    logModule: "FUTURES",
    logTitle: "Cancel futures order",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", description: "UUID of the order" },
        },
        {
            name: "timestamp",
            in: "query",
            required: true,
            schema: { type: "string", description: "Timestamp of the order" },
        },
    ],
    responses: {
        200: {
            description: "Order cancelled successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string", description: "Success message" },
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const { params, query, user, ctx } = data;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    const { timestamp } = query;
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Validating request parameters");
    if (!id || !timestamp) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, "Missing order ID or timestamp");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid request parameters",
        });
    }
    try {
        const result = await (0, order_1.cancelOrderByUuid)(user.id, id, timestamp);
        return { message: "Order cancelled and unfilled collateral released", ...result };
    } catch (error) {
        throw (0, error_1.createError)({ statusCode: error.statusCode || 503, message: error.message || "Cancellation pending; retry the same order" });
    }
};
