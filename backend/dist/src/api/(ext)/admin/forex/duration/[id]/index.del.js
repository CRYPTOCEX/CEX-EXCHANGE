"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const in_use_guard_1 = require("../../in-use-guard");
exports.metadata = {
    summary: "Deletes a Forex duration",
    description: "Deletes a specific Forex duration configuration by its ID. Refused while any active investment still uses it, because the database-level cascade would physically remove those investments and the record of the money they hold.",
    operationId: "deleteForexDuration",
    tags: ["Admin", "Forex", "Duration"],
    parameters: (0, query_1.deleteRecordParams)("Forex duration"),
    responses: (0, query_1.deleteRecordResponses)("Forex duration"),
    permission: "delete.forex.duration",
    requiresAuth: true,
    logModule: "ADMIN_FOREX",
    logTitle: "Delete forex duration",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating forex duration ${params.id}`);
    await (0, in_use_guard_1.assertNotInUseByInvestments)("duration", [params.id], (0, in_use_guard_1.isForce)(query));
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting forex duration ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        model: "forexDuration",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Forex duration deleted successfully");
    return result;
};
