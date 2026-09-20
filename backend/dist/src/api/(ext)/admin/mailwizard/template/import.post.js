"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Import a Mailwizard template",
    operationId: "importMailwizardTemplate",
    tags: ["Admin", "Mailwizard", "Templates"],
    description: "Imports a new Mailwizard email template with content and design configuration. This endpoint is used to import pre-designed templates with both HTML content and visual design data.",
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
        }, "Mailwizard template imported successfully"),
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        409: (0, errors_1.conflictResponse)("Mailwizard Template"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "create.mailwizard.template",
    logModule: "ADMIN_MAIL",
    logTitle: "Import template",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { name, content, design } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Importing template");
    const result = await (0, query_1.storeRecord)({
        model: "mailwizardTemplate",
        data: {
            name,
            content,
            design,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Template imported successfully");
    return result;
};
