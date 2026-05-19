"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const approval_service_1 = require("../../../utils/approval-service");
const verification_1 = require("../../../utils/verification");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Verify NFT token approval transaction",
    operationId: "verifyNftTokenApproval",
    tags: ["NFT", "Token", "Approval", "Blockchain"],
    logModule: "NFT",
    logTitle: "Verify Token Approval",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Token ID",
            schema: { type: "string", format: "uuid" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        transactionHash: {
                            type: "string",
                            description: "Hash of the approval transaction"
                        },
                        approvalType: {
                            type: "string",
                            enum: ["single", "all"],
                            description: "Type of approval: 'single' for specific token, 'all' for all tokens",
                            default: "single"
                        }
                    },
                    required: ["transactionHash"]
                }
            }
        }
    },
    responses: {
        200: {
            description: "Approval transaction verified successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    tokenId: { type: "string" },
                                    transactionHash: { type: "string" },
                                    blockNumber: { type: "integer" },
                                    gasUsed: { type: "string" },
                                    gasFee: { type: "string" },
                                    approvalType: { type: "string" },
                                    marketplaceContract: { type: "string" },
                                    isApproved: { type: "boolean" },
                                    verified: { type: "boolean" }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Not token owner" },
        404: { description: "Token not found" },
        409: { description: "Transaction already used" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true
};
exports.default = async (data) => {
    var _a;
    const { user, params, body, ctx } = data;
    const { id } = params;
    const { transactionHash, approvalType = "single" } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!id) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Token ID is required"
        });
    }
    if (!transactionHash) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Transaction hash is required"
        });
    }
    if (!user.walletAddress) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "User must have wallet address set to verify approval transactions"
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch token and verify ownership");
        const token = await db_1.models.nftToken.findOne({
            where: { id },
            include: [
                {
                    model: db_1.models.nftCollection,
                    as: "collection",
                    attributes: ["id", "name", "contractAddress", "chain", "standard"]
                },
                {
                    model: db_1.models.user,
                    as: "owner",
                    attributes: ["id", "walletAddress"]
                }
            ]
        });
        if (!token) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Token not found"
            });
        }
        if (token.ownerId !== user.id) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "You can only verify approval for tokens you own"
            });
        }
        if (!token.isMinted || !token.blockchainTokenId) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Token must be minted on blockchain first"
            });
        }
        if (!((_a = token.collection) === null || _a === void 0 ? void 0 : _a.contractAddress)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Collection contract must be deployed first"
            });
        }
        const marketplaceAddress = await approval_service_1.NFTApprovalService.getMarketplaceContractAddress(token.collection.chain);
        if (!marketplaceAddress) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "No marketplace contract deployed for this chain"
            });
        }
        const isUsed = await verification_1.TransactionVerificationService.isTransactionHashUsed(transactionHash);
        if (isUsed) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "Transaction hash has already been used"
            });
        }
        const isValidApproval = await approval_service_1.NFTApprovalService.verifyApprovalTransaction({
            transactionHash,
            tokenId: token.blockchainTokenId,
            contractAddress: token.collection.contractAddress,
            marketplaceAddress,
            chain: token.collection.chain,
            standard: token.collection.standard
        });
        if (!isValidApproval) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid approval transaction or transaction not found"
            });
        }
        const verification = await verification_1.TransactionVerificationService.verifyTransactionExists(transactionHash, token.collection.chain);
        if (!verification.isValid) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: verification.errorMessage || "Transaction verification failed"
            });
        }
        await db_1.models.nftActivity.create({
            tokenId: token.id,
            collectionId: token.collectionId,
            type: "TRANSFER",
            fromUserId: user.id,
            toUserId: undefined,
            price: undefined,
            currency: undefined,
            transactionHash,
            metadata: JSON.stringify({
                action: "TOKEN_APPROVED",
                approvalType,
                marketplaceAddress,
                contractAddress: token.collection.contractAddress,
                blockchainTokenId: token.blockchainTokenId
            })
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Check current approval status");
        const currentApprovalStatus = await approval_service_1.NFTApprovalService.checkTokenApproval(token.collection.contractAddress, token.blockchainTokenId, user.walletAddress, marketplaceAddress, token.collection.chain, token.collection.standard);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Approval transaction verified successfully");
        return {
            message: "Approval transaction verified successfully",
            data: {
                tokenId: token.id,
                transactionHash,
                blockNumber: verification.blockNumber,
                gasUsed: verification.gasUsed,
                gasFee: verification.gasFee,
                approvalType,
                marketplaceContract: marketplaceAddress,
                contractAddress: token.collection.contractAddress,
                isApproved: currentApprovalStatus.isApproved,
                verified: true
            }
        };
    }
    catch (error) {
        console_1.logger.error("VERIFY_NFT_APPROVAL", "Failed to verify approval transaction", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to verify approval transaction"
        });
    }
};
