"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Create a new Mailwizard template",
    operationId: "createMailwizardTemplate",
    tags: ["Admin", "Mailwizard", "Templates"],
    description: "Creates a new empty Mailwizard email template with default content and design configuration. The template can be edited later using the update endpoint. Default values are empty JSON objects for both content and design.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.mailwizardTemplateCreateSchema,
            },
        },
    },
    responses: {
        200: (0, errors_1.singleItemResponse)({
            type: "object",
            properties: utils_1.mailwizardTemplateSchema,
        }, "Mailwizard template created successfully"),
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        409: (0, errors_1.conflictResponse)("Mailwizard Template"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "create.mailwizard.template",
    logModule: "ADMIN_MAIL",
    logTitle: "Create template",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { name } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating template");
    const result = await (0, query_1.storeRecord)({
        model: "mailwizardTemplate",
        data: {
            name,
            content: "{}",
            design: "{}",
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Template created successfully");
    return result;
};
