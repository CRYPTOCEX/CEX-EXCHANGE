"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Delete a Mailwizard campaign",
    operationId: "deleteMailwizardCampaign",
    tags: ["Admin", "Mailwizard", "Campaigns"],
    description: "Permanently deletes a specific Mailwizard campaign by ID. This operation cannot be undone and will remove all campaign data including targets and execution history.",
    parameters: (0, query_1.deleteRecordParams)("Mailwizard campaign"),
    responses: (0, errors_1.deleteResponses)("Mailwizard Campaign"),
    permission: "delete.mailwizard.campaign",
    requiresAuth: true,
    logModule: "ADMIN_MAIL",
    logTitle: "Delete campaign",
};
exports.default = async (data) => {
    const { params, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting campaign");
    const result = await (0, query_1.handleSingleDelete)({
        model: "mailwizardCampaign",
        id: params.id,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Campaign deleted successfully");
    return result;
};
