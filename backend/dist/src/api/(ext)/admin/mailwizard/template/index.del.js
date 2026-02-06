"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Bulk delete Mailwizard templates",
    operationId: "bulkDeleteMailwizardTemplates",
    tags: ["Admin", "Mailwizard", "Templates"],
    description: "Permanently deletes multiple Mailwizard templates by their IDs. This operation cannot be undone. Templates that are currently in use by active campaigns cannot be deleted.",
    parameters: (0, query_1.commonBulkDeleteParams)("Mailwizard Templates"),
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
                            description: "Array of Mailwizard template IDs to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: (0, errors_1.bulkDeleteResponses)("Mailwizard Template"),
    requiresAuth: true,
    permission: "delete.mailwizard.template",
    logModule: "ADMIN_MAIL",
    logTitle: "Bulk delete templates",
};
exports.default = async (data) => {
    const { body, query, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} templates`);
    const result = await (0, query_1.handleBulkDelete)({
        model: "mailwizardTemplate",
        ids,
        query,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${ids.length} templates deleted successfully`);
    return result;
};
