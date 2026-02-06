"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves a specific KYC application by ID",
    operationId: "getKycApplicationById",
    tags: ["Admin", "CRM", "KYC"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the KYC application to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "KYC application details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.kycApplicationSchema,
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("KYC application not found"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.kyc.application",
    logModule: "ADMIN_CRM",
    logTitle: "View KYC application",
    demoMask: ["user.email", "user.phone"],
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching KYC application ${params.id}`);
    const result = await (0, query_1.getRecord)("kycApplication", params.id, [
        {
            model: db_1.models.user,
            as: "user",
            attributes: [
                "id",
                "email",
                "avatar",
                "firstName",
                "lastName",
                "emailVerified",
                "phone",
                "lastLogin",
                "lastFailedLogin",
                "failedLoginAttempts",
                "status",
                "createdAt",
                "profile",
            ],
            includeModels: [
                {
                    model: db_1.models.role,
                    as: "role",
                    attributes: ["id", "name"],
                    includeModels: [
                        {
                            model: db_1.models.permission,
                            as: "permissions",
                            attributes: ["id", "name"],
                            through: {
                                attributes: [],
                            },
                        },
                    ],
                },
            ],
        },
        {
            model: db_1.models.kycLevel,
            as: "level",
            paranoid: false,
            includeModels: [
                {
                    model: db_1.models.kycVerificationService,
                    as: "verificationService",
                },
            ],
        },
        {
            model: db_1.models.kycVerificationResult,
            as: "verificationResult",
        },
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("KYC application retrieved successfully");
    return result;
};
