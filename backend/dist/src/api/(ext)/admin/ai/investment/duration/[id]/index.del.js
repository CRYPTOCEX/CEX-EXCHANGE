"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const guards_1 = require("../../utils/guards");
const referential_guard_1 = require("@b/utils/referential-guard");
exports.metadata = {
    summary: "Delete an AI investment duration",
    operationId: "deleteAiInvestmentDuration",
    tags: ["Admin", "AI Investment", "Duration"],
    description: "Deletes a specific AI investment duration by ID. This will remove the duration option from the system.",
    parameters: (0, query_1.deleteRecordParams)("AI Investment Duration"),
    responses: (0, query_1.deleteRecordResponses)("AI Investment Duration"),
    permission: "delete.ai.investment.duration",
    requiresAuth: true,
    logModule: "ADMIN_AI",
    logTitle: "Delete investment duration",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for dependent investments");
    await (0, guards_1.assertDurationsDeletable)(params.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting duration ${params.id}`);
    const result = await (0, query_1.handleSingleDelete)({
        preDelete: () => (0, referential_guard_1.assertNoDependentRows)({
            dependents: [
                { model: "aiInvestment", foreignKey: "durationId", label: "investment" },
            ],
            parentIds: [params.id],
            parentLabel: "duration",
            force: (0, referential_guard_1.isForce)(query),
            parentIsParanoid: false,
        }),
        model: "aiInvestmentDuration",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Duration deleted successfully");
    return result;
};
