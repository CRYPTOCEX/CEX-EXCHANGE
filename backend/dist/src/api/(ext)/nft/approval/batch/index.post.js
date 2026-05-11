"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const approval_service_1 = require("../../utils/approval-service");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Check batch NFT token approval status",
    operationId: "checkBatchNftApproval",
    tags: ["NFT", "Token", "Approval", "Batch"],
    logModule: "NFT",
    logTitle: "Check batch NFT approval status",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        tokenIds: {
                            type: "array",
                            items: { type: "string", format: "uuid" },
                            description: "Array of token IDs to check approval status",
                            minItems: 1,
                            maxItems: 50
                        }
                    },
                    required: ["tokenIds"]
                }
            }
        }
    },
    responses: {
        200: {
            description: "Batch approval status retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    totalTokens: { type: "integer" },
                                    approvedCount: { type: "integer" },
                                    pendingCount: { type: "integer" },
                                    errorCount: { type: "integer" },
                                    results: {
                                        type: "object",
                                        additionalProperties: {
                                            type: "object",
                                            properties: {
                                                tokenId: { type: "string" },
                                                isApproved: { type: "boolean" },
                                                requiresApproval: { type: "boolean" },
                                                approvedOperator: { type: "string" },
                                                tokenOwner: { type: "string" },
                                                marketplaceContract: { type: "string" },
                                                canList: { type: "boolean" },
                                                errorMessage: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    const { tokenIds } = body;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Token IDs array is required and must not be empty"
        });
    }
    if (tokenIds.length > 50) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Maximum 50 tokens can be checked at once"
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking approval status for ${tokenIds.length} tokens`);
        const approvalResults = await approval_service_1.NFTApprovalService.checkBatchApproval(tokenIds, user.id);
        let approvedCount = 0;
        let pendingCount = 0;
        let errorCount = 0;
        const processedResults = {};
        for (const [tokenId, status] of Object.entries(approvalResults)) {
            processedResults[tokenId] = {
                tokenId,
                isApproved: status.isApproved,
                requiresApproval: status.requiresApproval,
                approvedOperator: status.approvedOperator,
                tokenOwner: status.tokenOwner,
                marketplaceContract: status.marketplaceContract,
                canList: status.isApproved && !status.errorMessage,
                errorMessage: status.errorMessage
            };
            if (status.errorMessage) {
                errorCount++;
            }
            else if (status.isApproved) {
                approvedCount++;
            }
            else {
                pendingCount++;
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved approval status for ${tokenIds.length} tokens: ${approvedCount} approved, ${pendingCount} pending, ${errorCount} errors`);
        return {
            message: "Batch approval status retrieved successfully",
            data: {
                totalTokens: tokenIds.length,
                approvedCount,
                pendingCount,
                errorCount,
                results: processedResults
            }
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to check batch approval status: ${error.message}`);
        console_1.logger.error("NFT", "Failed to check batch NFT approval status", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to check batch approval status"
        });
    }
};
