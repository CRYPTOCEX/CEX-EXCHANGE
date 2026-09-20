"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const cron_1 = require("@b/api/(ext)/p2p/utils/cron");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Manually Trigger P2P Trade Timeout",
    description: "Manually triggers the P2P trade timeout process to expire trades that have passed their expiration time. Admin-only endpoint.",
    operationId: "triggerP2PTradeTimeout",
    tags: ["Admin", "P2P", "Trades", "Cron"],
    requiresAuth: true,
    logModule: "ADMIN_P2P",
    logTitle: "Trigger trade timeout",
    responses: {
        200: {
            description: "Trade timeout process completed successfully",
        },
        401: {
            description: "Unauthorized - Admin access required",
        },
        500: {
            description: "Internal Server Error",
        },
    },
    permission: "edit.p2p.trade",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized: Admin access required",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Executing trade timeout process");
        await (0, cron_1.p2pTradeTimeout)();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Trade timeout process completed successfully");
        return {
            message: "P2P trade timeout process completed successfully",
            executedBy: user.id,
            executedAt: new Date().toISOString(),
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to execute trade timeout process");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to execute P2P trade timeout process",
        });
    }
};
