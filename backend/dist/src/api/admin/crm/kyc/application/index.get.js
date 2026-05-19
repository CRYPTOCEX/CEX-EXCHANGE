"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all KYC applications with pagination and optional filtering",
    operationId: "listKycApplications",
    tags: ["Admin", "CRM", "KYC"],
    parameters: constants_1.crudParameters,
    logModule: "ADMIN_CRM",
    logTitle: "List KYC applications",
    responses: {
        200: {
            description: "Paginated list of KYC applications with detailed user and template information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.kycApplicationSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("KYC Applications"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.kyc.application",
    demoMask: ["items.user.email"],
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching KYC applications");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.kycApplication,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
            {
                model: db_1.models.kycLevel,
                as: "level",
                attributes: ["id", "name", "description"],
                paranoid: false,
                includeModels: [
                    {
                        model: db_1.models.kycVerificationService,
                        as: "verificationService",
                        attributes: ["id", "name"],
                    },
                ],
            },
            {
                model: db_1.models.kycVerificationResult,
                as: "verificationResult",
                attributes: ["id", "status", "createdAt"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("KYC applications retrieved successfully");
    return result;
};
