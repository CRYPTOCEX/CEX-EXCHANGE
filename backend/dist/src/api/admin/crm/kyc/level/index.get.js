"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
exports.metadata = {
    summary: "Lists all KYC templates with pagination and optional filtering",
    operationId: "listKycTemplates",
    tags: ["Admin", "CRM", "KYC Template"],
    parameters: constants_1.crudParameters,
    logModule: "ADMIN_CRM",
    logTitle: "List KYC levels",
    responses: {
        200: {
            description: "Paginated list of KYC templates with detailed information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        name: { type: "string" },
                                        description: { type: "string" },
                                        status: {
                                            type: "string",
                                            enum: ["ACTIVE", "DRAFT", "INACTIVE"],
                                            description: "Level status",
                                        },
                                        createdAt: { type: "string", format: "date-time" },
                                        updatedAt: { type: "string", format: "date-time" },
                                    },
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("KYC Templates"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.kyc.level",
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching KYC levels");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.kycLevel,
        query,
        sortField: query.sortField || "createdAt",
        timestamps: false,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("KYC levels retrieved successfully");
    return result;
};
