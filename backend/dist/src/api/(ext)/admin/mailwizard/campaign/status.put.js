"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Bulk update campaign status",
    operationId: "bulkUpdateMailwizardCampaignStatus",
    tags: ["Admin", "Mailwizard", "Campaigns"],
    description: "Updates the status of multiple Mailwizard campaigns simultaneously. Valid statuses: PENDING, PAUSED, ACTIVE, STOPPED, COMPLETED, CANCELLED. This allows for efficient batch status changes across multiple campaigns.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of Mailwizard Campaign IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            enum: [
                                "PENDING",
                                "PAUSED",
                                "ACTIVE",
                                "STOPPED",
                                "COMPLETED",
                                "CANCELLED",
                            ],
                            description: "New status to apply to the Mailwizard Campaigns",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, errors_1.statusUpdateResponses)("Mailwizard Campaign"),
    requiresAuth: true,
    permission: "edit.mailwizard.campaign",
    logModule: "ADMIN_MAIL",
    logTitle: "Bulk update campaign status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status of ${ids.length} campaigns to ${status}`);
    const result = await (0, query_1.updateStatus)("mailwizardCampaign", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} campaigns status updated successfully`);
    return result;
};
