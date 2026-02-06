"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Get All Verification Services",
    description: "Retrieves all available verification services for KYC processes.",
    operationId: "getVerificationServices",
    tags: ["KYC", "Verification Services"],
    logModule: "ADMIN_CRM",
    logTitle: "Get verification services",
    responses: {
        200: {
            description: "Verification services retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: {
                                    type: "string",
                                    description: "Unique identifier for the service",
                                },
                                name: {
                                    type: "string",
                                    description: "Name of the verification service",
                                },
                                description: {
                                    type: "string",
                                    description: "Description of the service",
                                },
                                type: {
                                    type: "string",
                                    description: "Type of verification service",
                                },
                                status: {
                                    type: "string",
                                    description: "Current status of the service",
                                },
                                integrationDetails: {
                                    type: "object",
                                    description: "Integration details for the service",
                                },
                                createdAt: {
                                    type: "string",
                                    format: "date-time",
                                    description: "When the service was created",
                                },
                                updatedAt: {
                                    type: "string",
                                    format: "date-time",
                                    description: "When the service was last updated",
                                },
                            },
                        },
                    },
                },
            },
        },
        500: { description: "Internal Server Error." },
    },
    permission: "view.kyc.verification",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching verification services");
        const services = await db_1.models.kycVerificationService.findAll({
            order: [["createdAt", "ASC"]],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Verification services retrieved successfully");
        return services;
    }
    catch (error) {
        console_1.logger.error("KYC", "Error in getVerificationServices", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch verification services",
        });
    }
};
