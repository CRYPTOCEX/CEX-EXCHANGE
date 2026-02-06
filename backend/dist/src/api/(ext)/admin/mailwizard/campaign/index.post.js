"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Create a new Mailwizard campaign",
    operationId: "createMailwizardCampaign",
    tags: ["Admin", "Mailwizard", "Campaigns"],
    description: "Creates a new Mailwizard campaign with the specified configuration. The campaign will be created in PENDING status by default and requires a valid template ID. Name and subject are required fields.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.mailwizardCampaignUpdateSchema,
            },
        },
    },
    responses: {
        200: (0, errors_1.singleItemResponse)({
            type: "object",
            properties: utils_1.mailwizardCampaignSchema,
        }, "Mailwizard campaign created successfully"),
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        409: (0, errors_1.conflictResponse)("Mailwizard Campaign"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "create.mailwizard.campaign",
    logModule: "ADMIN_MAIL",
    logTitle: "Create campaign",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { name, subject, speed, templateId } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating campaign");
    const result = await (0, query_1.storeRecord)({
        model: "mailwizardCampaign",
        data: {
            name,
            subject,
            status: "PENDING",
            speed,
            templateId,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Campaign created successfully");
    return result;
};
