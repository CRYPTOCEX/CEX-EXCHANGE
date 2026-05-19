"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Retrieves a list of KYC levels",
    description: "This endpoint retrieves all available KYC levels.",
    operationId: "getKycLevels",
    tags: ["KYC Level"],
    requiresAuth: true,
    logModule: "ADMIN_CRM",
    logTitle: "Get KYC level options",
    responses: {
        200: {
            description: "KYC levels retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                name: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("KYC Level"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching KYC level options");
        const kycLevels = await db_1.models.kycLevel.findAll();
        const formatted = kycLevels.map((kycLevel) => ({
            id: kycLevel.id,
            name: kycLevel.name,
        }));
        ctx === null || ctx === void 0 ? void 0 : ctx.success("KYC level options retrieved successfully");
        return formatted;
    }
    catch (error) {
        throw (0, error_1.createError)(500, "An error occurred while fetching KYC levels");
    }
};
