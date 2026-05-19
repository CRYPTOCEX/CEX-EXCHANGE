"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Update a Mailwizard template",
    operationId: "updateMailwizardTemplate",
    tags: ["Admin", "Mailwizard", "Templates"],
    description: "Updates the content and design configuration of a specific Mailwizard template. Both content and design fields must be provided as JSON strings representing the template structure.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the Mailwizard Template to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the Mailwizard Template",
        content: {
            "application/json": {
                schema: utils_1.mailwizardTemplateUpdateSchema,
            },
        },
    },
    responses: (0, errors_1.updateResponses)("Mailwizard Template"),
    requiresAuth: true,
    permission: "edit.mailwizard.template",
    logModule: "ADMIN_MAIL",
    logTitle: "Update template",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { content, design } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating template");
    const result = await (0, query_1.updateRecord)("mailwizardTemplate", id, {
        content,
        design,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Template updated successfully");
    return result;
};
