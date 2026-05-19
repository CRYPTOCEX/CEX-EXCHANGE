"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
const demoMask_1 = require("@b/utils/demoMask");
exports.metadata = {
    summary: "Get a Mailwizard campaign",
    operationId: "getMailwizardCampaignById",
    tags: ["Admin", "Mailwizard", "Campaigns"],
    description: "Retrieves detailed information about a specific Mailwizard campaign including its configuration, status, targets, and associated template details.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the Mailwizard Campaign to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: (0, errors_1.singleItemResponse)({
            type: "object",
            properties: {
                ...utils_1.baseMailwizardCampaignSchema,
                template: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "Template ID" },
                        name: { type: "string", description: "Template name" },
                    },
                },
            },
        }, "Mailwizard campaign retrieved successfully"),
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Mailwizard Campaign"),
        500: errors_1.serverErrorResponse,
    },
    permission: "view.mailwizard.campaign",
    requiresAuth: true,
    logModule: "ADMIN_MAIL",
    logTitle: "Get Mail Campaign",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch mail campaign by ID");
    const result = await (0, query_1.getRecord)("mailwizardCampaign", params.id, [
        {
            model: db_1.models.mailwizardTemplate,
            as: "template",
            attributes: ["id", "name"],
        },
    ]);
    if (result && result.targets) {
        try {
            const targets = JSON.parse(result.targets);
            const maskedTargets = (0, demoMask_1.applyDemoMask)(targets, ["email"]);
            result.targets = JSON.stringify(maskedTargets);
        }
        catch (error) {
            console.error("Failed to parse targets for email masking:", error);
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Mail Campaign retrieved successfully");
    return result;
};
