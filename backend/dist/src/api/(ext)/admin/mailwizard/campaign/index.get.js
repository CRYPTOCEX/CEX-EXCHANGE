"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "List Mailwizard campaigns",
    operationId: "listMailwizardCampaigns",
    tags: ["Admin", "Mailwizard", "Campaigns"],
    description: "Retrieves a paginated list of all Mailwizard campaigns with optional filtering and sorting. Includes associated template information for each campaign. Supports filtering by status, name, subject, and date ranges.",
    parameters: constants_1.crudParameters,
    responses: {
        200: (0, errors_1.paginatedResponse)({
            type: "object",
            properties: {
                ...utils_1.mailwizardCampaignSchema,
                template: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "Template ID" },
                        name: { type: "string", description: "Template name" },
                    },
                },
            },
        }, "Mailwizard campaigns retrieved successfully"),
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Mailwizard Campaign"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_MAIL",
    logTitle: "Get Mail Campaigns",
    permission: "view.mailwizard.campaign",
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Process request");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Mail Campaigns retrieved successfully");
    return (0, query_1.getFiltered)({
        model: db_1.models.mailwizardCampaign,
        query,
        sortField: query.sortField || "createdAt",
        customStatus: [
            {
                key: "status",
                true: "ACTIVE",
                false: "PENDING",
            },
        ],
        includeModels: [
            {
                model: db_1.models.mailwizardTemplate,
                as: "template",
                attributes: ["id", "name"],
            },
        ],
    });
};
