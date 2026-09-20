"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "List Mailwizard templates",
    operationId: "listMailwizardTemplates",
    tags: ["Admin", "Mailwizard", "Templates"],
    description: "Retrieves a paginated list of all Mailwizard email templates with optional filtering and sorting. Templates can be filtered by name, creation date, and other criteria.",
    parameters: constants_1.crudParameters,
    responses: {
        200: (0, errors_1.paginatedResponse)({
            type: "object",
            properties: utils_1.mailwizardTemplateSchema,
        }, "Mailwizard templates retrieved successfully"),
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Mailwizard Template"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_MAIL",
    logTitle: "Get Mail Templates",
    permission: "view.mailwizard.template",
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch mail templates with filters");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.mailwizardTemplate,
        query,
        sortField: query.sortField || "createdAt",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Mail Templates retrieved successfully");
    return result;
};
