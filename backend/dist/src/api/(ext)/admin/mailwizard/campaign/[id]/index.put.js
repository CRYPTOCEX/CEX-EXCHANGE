"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Update a Mailwizard campaign",
    operationId: "updateMailwizardCampaign",
    tags: ["Admin", "Mailwizard", "Campaigns"],
    description: "Updates the configuration of a specific Mailwizard campaign including name, subject, status, speed, targets, and template. All fields are optional and only provided fields will be updated.",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "ID of the Mailwizard Campaign to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the Mailwizard Campaign",
        content: {
            "application/json": {
                schema: utils_1.mailwizardCampaignUpdateSchema,
            },
        },
    },
    responses: (0, errors_1.updateResponses)("Mailwizard Campaign"),
    requiresAuth: true,
    permission: "edit.mailwizard.campaign",
    logModule: "ADMIN_MAIL",
    logTitle: "Update campaign",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { name, subject, status, speed, targets, templateId } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating campaign");
    const result = await (0, query_1.updateRecord)("mailwizardCampaign", id, {
        name,
        subject,
        status,
        speed,
        targets,
        templateId,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Campaign updated successfully");
    return result;
};
