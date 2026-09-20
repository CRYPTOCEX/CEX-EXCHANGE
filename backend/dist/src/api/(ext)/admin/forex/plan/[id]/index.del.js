"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const in_use_guard_1 = require("../../in-use-guard");
exports.metadata = {
    summary: "Deletes a Forex plan",
    description: "Deletes a specific Forex plan by its ID. Refused while any active investment still uses it: soft-deleting a plan makes the settlement cron unable to resolve its investments (they stop paying out silently), and a permanent delete cascades those rows out of the database entirely.",
    operationId: "deleteForexPlan",
    tags: ["Admin", "Forex", "Plan"],
    parameters: (0, query_1.deleteRecordParams)("Forex plan"),
    responses: (0, query_1.deleteRecordResponses)("Forex plan"),
    logModule: "ADMIN_FOREX",
    logTitle: "Delete forex plan",
    permission: "delete.forex.plan",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating record ${params.id}`);
    await (0, in_use_guard_1.assertNotInUseByInvestments)("plan", [params.id], (0, in_use_guard_1.isForce)(query));
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting record ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "forexPlan",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Record deleted successfully");
    return result;
};
