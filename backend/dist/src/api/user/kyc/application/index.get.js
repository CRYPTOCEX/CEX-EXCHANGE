"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getKyc = getKyc;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Retrieves all KYC applications for the logged-in user",
    description: "Fetches all Know Your Customer (KYC) applications for the currently authenticated user. This endpoint requires user authentication and returns an array with the user's KYC application information, including the verification status and other details.",
    operationId: "getUserKycApplications",
    tags: ["KYC"],
    logModule: "USER",
    logTitle: "List KYC applications",
    responses: {
        200: {
            description: "KYC applications retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "number", description: "KYC ID" },
                                userId: {
                                    type: "number",
                                    description: "User ID associated with the KYC record",
                                },
                                templateId: {
                                    type: "number",
                                    description: "ID of the KYC template used",
                                },
                                data: {
                                    type: "object",
                                    description: "KYC data as a JSON object",
                                    nullable: true,
                                },
                                status: {
                                    type: "string",
                                    description: "Current status of the KYC verification",
                                    enum: ["PENDING", "APPROVED", "REJECTED"],
                                },
                                level: { type: "number", description: "Verification level" },
                                notes: {
                                    type: "string",
                                    description: "Administrative notes, if any",
                                    nullable: true,
                                },
                                createdAt: {
                                    type: "string",
                                    format: "date-time",
                                    description: "Timestamp when the KYC record was created",
                                },
                                updatedAt: {
                                    type: "string",
                                    format: "date-time",
                                    description: "Timestamp when the KYC record was last updated",
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Kyc"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving KYC applications");
    const result = await getKyc(user.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${result.length} KYC applications`);
    return result;
};
async function getKyc(userId) {
    const responses = await db_1.models.kycApplication.findAll({
        where: {
            userId,
        },
        include: [
            {
                model: db_1.models.kycLevel,
                as: "level",
                paranoid: false,
            },
            {
                model: db_1.models.kycVerificationResult,
                as: "verificationResult",
            },
        ],
    });
    if (responses.length === 0) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "KYC records not found",
        });
    }
    return responses.map((response) => response.get({ plain: true }));
}
