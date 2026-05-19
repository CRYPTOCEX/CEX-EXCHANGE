"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const order_1 = require("@b/api/(ext)/futures/utils/queries/order");
exports.metadata = {
    summary: "Cancel all futures orders",
    description: "Cancels all open futures orders for the authenticated user.",
    operationId: "cancelAllFuturesOrders",
    tags: ["Futures", "Orders"],
    logModule: "FUTURES",
    logTitle: "Cancel all futures orders",
    responses: (0, query_1.createRecordResponses)("Orders cancelled"),
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e;
    const { user, ctx } = data;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Cancelling all open futures orders for user ${user.id}`);
        const result = await (0, order_1.cancelAllOrdersByUserId)(user.id);
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, `Cancelled ${result.cancelledCount || 0} futures orders`);
        return {
            message: "All futures orders cancelled successfully",
            cancelledCount: result.cancelledCount || 0,
        };
    }
    catch (error) {
        console.error("Error cancelling all futures orders:", error);
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, `Failed to cancel orders: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to cancel all futures orders: ${error.message}`,
        });
    }
};
