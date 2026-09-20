"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Bulk update template status",
    operationId: "bulkUpdateMailwizardTemplateStatus",
    tags: ["Admin", "Mailwizard", "Templates"],
    description: "Updates the status of multiple Mailwizard templates simultaneously. Valid statuses: ACTIVE, INACTIVE, ARCHIVED. This allows for efficient batch status management of templates.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            description: "Array of Mailwizard Template IDs to update",
                            items: { type: "string" },
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "INACTIVE", "ARCHIVED"],
                            description: "New status to apply to the Mailwizard Templates",
                        },
                    },
                    required: ["ids", "status"],
                },
            },
        },
    },
    responses: (0, errors_1.statusUpdateResponses)("Mailwizard Template"),
    requiresAuth: true,
    permission: "edit.mailwizard.template",
    logModule: "ADMIN_MAIL",
    logTitle: "Bulk update template status",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating status of ${ids.length} templates to ${status}`);
    const result = await (0, query_1.updateStatus)("mailwizardTemplate", ids, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} templates status updated successfully`);
    return result;
};
