"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Bulk delete Mailwizard campaigns",
    description: "Permanently deletes multiple Mailwizard campaigns by their IDs. This operation cannot be undone and will remove all campaign data including targets and execution history.",
    operationId: "bulkDeleteMailwizardCampaigns",
    tags: ["Admin", "Mailwizard", "Campaigns"],
    parameters: (0, query_1.commonBulkDeleteParams)("Mailwizard Campaigns"),
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of Mailwizard campaign IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, errors_1.bulkDeleteResponses)("Mailwizard Campaign"),
    requiresAuth: true,
    permission: "delete.mailwizard.campaign",
    logModule: "ADMIN_MAIL",
    logTitle: "Bulk delete campaigns",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} campaigns`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "mailwizardCampaign",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} campaigns deleted successfully`);
    return result;
};
