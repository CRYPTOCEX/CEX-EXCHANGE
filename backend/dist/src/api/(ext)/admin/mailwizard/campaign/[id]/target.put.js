"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update campaign targets",
    operationId: "updateMailwizardCampaignTargets",
    tags: ["Admin", "Mailwizard", "Campaigns"],
    description: "Updates the email target list for a specific Mailwizard campaign. Targets should be provided as a JSON string containing an array of email recipient objects with their delivery status.",
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
                schema: {
                    type: "object",
                    properties: {
                        targets: {
                            type: "string",
                            description: "Email targets for the campaign",
                        },
                    },
                },
            },
        },
    },
    responses: (0, errors_1.updateResponses)("Mailwizard Campaign"),
    requiresAuth: true,
    permission: "edit.mailwizard.campaign",
    logModule: "ADMIN_MAIL",
    logTitle: "Update campaign targets",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { targets } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating campaign targets");
    const result = await (0, query_1.updateRecord)("mailwizardCampaign", id, {
        targets,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Campaign targets updated successfully");
    return result;
};
