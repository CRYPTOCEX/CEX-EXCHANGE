"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const reconcile_1 = require("@b/utils/pool-backing/reconcile");
exports.metadata = {
    summary: "Runs a pool-backing reconciliation now",
    description: "Reads every SPOT liability and every exchange account balance, computes the gap per currency and the residual the obligation ledger does not explain, and writes one reconciliation row per currency. Moves no money. The cron does the same every fifteen minutes.",
    operationId: "runPoolBackingReconciliation",
    tags: ["Admin", "Finance", "Pool Backing"],
    requiresAuth: true,
    permission: "edit.pool.backing",
    logModule: "ADMIN_FIN",
    logTitle: "Run pool-backing reconciliation",
    responses: {
        200: { description: "Run summary" },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Running reconciliation");
    const summary = await (0, reconcile_1.runPoolBackingReconciliation)({ trigger: "admin", actorId: user.id });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(summary.skipped ? `Skipped: ${summary.skipped}` : `${summary.currencies} currencies reconciled`);
    return summary;
};
