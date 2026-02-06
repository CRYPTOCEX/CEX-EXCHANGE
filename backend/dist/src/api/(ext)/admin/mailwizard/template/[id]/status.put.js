"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update template status",
    operationId: "updateMailwizardTemplateStatus",
    tags: ["Admin", "Mailwizard", "Templates"],
    description: "Updates the status of a specific Mailwizard template. Valid statuses: ACTIVE, INACTIVE, ARCHIVED. Changing status to INACTIVE or ARCHIVED may affect campaigns using this template.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the Mailwizard Template to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "INACTIVE", "ARCHIVED"],
                            description: "New status to apply to the Mailwizard Template",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, errors_1.statusUpdateResponses)("Mailwizard Template"),
    requiresAuth: true,
    permission: "edit.mailwizard.template",
    logModule: "ADMIN_MAIL",
    logTitle: "Update template status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating template status to ${status}`);
    const result = await (0, query_1.updateStatus)("mailwizardTemplate", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Template status updated successfully");
    return result;
};
