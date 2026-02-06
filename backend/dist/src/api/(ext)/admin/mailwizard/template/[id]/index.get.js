"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Get a Mailwizard template",
    operationId: "getMailwizardTemplateById",
    tags: ["Admin", "Mailwizard", "Templates"],
    description: "Retrieves detailed information about a specific Mailwizard template including its complete content and design configuration. The response includes all template data needed for editing or preview.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the Mailwizard Template to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: (0, errors_1.singleItemResponse)({
            type: "object",
            properties: utils_1.baseMailwizardTemplateSchema,
        }, "Mailwizard template retrieved successfully"),
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Mailwizard Template"),
        500: errors_1.serverErrorResponse,
    },
    permission: "view.mailwizard.template",
    requiresAuth: true,
    logModule: "ADMIN_MAIL",
    logTitle: "Get Mail Template",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Process request");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Mail Template retrieved successfully");
    return await (0, query_1.getRecord)("mailwizardTemplate", params.id);
};
