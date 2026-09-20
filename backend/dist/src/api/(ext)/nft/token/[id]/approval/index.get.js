"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const approval_service_1 = require("../../../utils/approval-service");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Check NFT token approval status",
    operationId: "checkNftTokenApproval",
    tags: ["NFT", "Token", "Approval"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Token ID",
            schema: { type: "string", format: "uuid" },
        },
    ],
    responses: {
        200: {
            description: "Token approval status retrieved successfully",
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
                                    isApproved: { type: "boolean" },
                                    requiresApproval: { type: "boolean" },
                                    approvedOperator: { type: "string" },
                                    tokenOwner: { type: "string" },
                                    marketplaceContract: { type: "string" },
                                    chain: { type: "string" },
                                    contractAddress: { type: "string" },
                                    blockchainTokenId: { type: "string" },
                                    canList: { type: "boolean" },
                                    errorMessage: { type: "string" }
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
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { user, params } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!id) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Token ID is required"
        });
    }
    try {
        const token = await db_1.models.nftToken.findOne({
            where: { id },
            include: [
                {
                    model: db_1.models.nftCollection,
                    as: "collection",
                    attributes: ["id", "name", "contractAddress", "chain", "standard"]
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
                message: "You can only check approval status for tokens you own"
            });
        }
        const ownerWallet = data.query.walletAddress;
        let canList = true;
        let errorMessage = "";
        if (!ownerWallet) {
            canList = false;
            errorMessage = "Please connect your Web3 wallet to list this NFT";
        }
        else if (!token.isMinted || !token.blockchainTokenId) {
            canList = false;
            errorMessage = "Token must be minted on blockchain first";
        }
        else if (!((_a = token.collection) === null || _a === void 0 ? void 0 : _a.contractAddress)) {
            canList = false;
            errorMessage = "Collection contract must be deployed first";
        }
        if (!canList) {
            return {
                tokenId: token.id,
                isApproved: false,
                requiresApproval: true,
                canList: false,
                errorMessage,
                chain: (_b = token.collection) === null || _b === void 0 ? void 0 : _b.chain,
                contractAddress: (_c = token.collection) === null || _c === void 0 ? void 0 : _c.contractAddress,
                blockchainTokenId: token.blockchainTokenId
            };
        }
        const collection = token.collection;
        const marketplaceAddress = await approval_service_1.NFTApprovalService.getMarketplaceContractAddress(collection.chain);
        if (!marketplaceAddress) {
            return {
                tokenId: token.id,
                isApproved: false,
                requiresApproval: false,
                message: "No marketplace contract deployed for this chain"
            };
        }
        const approvalStatus = await approval_service_1.NFTApprovalService.checkTokenApproval(collection.contractAddress, token.blockchainTokenId, ownerWallet, marketplaceAddress, collection.chain, collection.standard);
        return {
            tokenId: token.id,
            isApproved: approvalStatus.isApproved,
            requiresApproval: approvalStatus.requiresApproval,
            approvedOperator: approvalStatus.approvedOperator,
            tokenOwner: approvalStatus.tokenOwner,
            marketplaceContract: approvalStatus.marketplaceContract || marketplaceAddress,
            chain: collection.chain,
            contractAddress: collection.contractAddress,
            blockchainTokenId: token.blockchainTokenId,
            canList: approvalStatus.isApproved,
            errorMessage: approvalStatus.errorMessage
        };
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to check token approval status", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to check token approval status"
        });
    }
};
