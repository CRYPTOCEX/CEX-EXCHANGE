"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const marketplace_service_1 = require("../../utils/marketplace-service");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Update NFT marketplace configuration",
    operationId: "updateNftMarketplaceConfig",
    tags: ["NFT", "Marketplace", "Config", "Admin"],
    logModule: "NFT",
    logTitle: "Update Marketplace Config",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        chain: {
                            type: "string",
                            description: "Blockchain chain (e.g., ETH, POLYGON, BSC)",
                            default: "ETH"
                        },
                        contractAddress: {
                            type: "string",
                            description: "Marketplace contract address"
                        },
                        feePercentage: {
                            type: "number",
                            description: "New marketplace fee percentage (0-10%)",
                            minimum: 0,
                            maximum: 10
                        },
                        feeRecipient: {
                            type: "string",
                            description: "New fee recipient wallet address"
                        }
                    },
                    required: ["chain", "contractAddress"]
                }
            }
        }
    },
    responses: {
        200: {
            description: "Marketplace configuration updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    chain: { type: "string" },
                                    contractAddress: { type: "string" },
                                    transactionHash: { type: "string" },
                                    feePercentage: { type: "number" },
                                    feeRecipient: { type: "string" },
                                    gasUsed: { type: "string" }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - Admin access required" },
        404: { description: "Marketplace contract not found" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true,
    permission: "access.nft.admin"
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    const { chain = "ETH", contractAddress, feePercentage, feeRecipient } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!contractAddress) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Contract address is required"
        });
    }
    if (!feePercentage && !feeRecipient) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "At least one configuration parameter (feePercentage or feeRecipient) must be provided"
        });
    }
    if (feePercentage !== undefined && (feePercentage < 0 || feePercentage > 10)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Fee percentage must be between 0% and 10%"
        });
    }
    if (feeRecipient && !/^0x[a-fA-F0-9]{40}$/.test(feeRecipient)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid fee recipient address format"
        });
    }
    try {
        const cacheManager = cache_1.CacheManager.getInstance();
        const marketplaceAddress = await cacheManager.getSetting(`nft_marketplace_address_${chain.toLowerCase()}`);
        if (!marketplaceAddress || marketplaceAddress !== contractAddress) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: `Marketplace contract not found for ${chain}`
            });
        }
        const marketplaceService = await (0, marketplace_service_1.getNFTMarketplaceService)(chain);
        marketplaceService.setMarketplaceAddress(contractAddress);
        const dbTransaction = await db_1.sequelize.transaction();
        const results = {
            chain: chain.toUpperCase(),
            contractAddress
        };
        try {
            if (feePercentage !== undefined) {
                const feeResult = await marketplaceService.updateFeePercentage(Math.floor(feePercentage * 100));
                if (feeResult.success) {
                    results.feePercentage = feePercentage;
                    results.feeTransactionHash = feeResult.transactionHash;
                    results.feeGasUsed = feeResult.gasUsed;
                }
            }
            if (feeRecipient) {
                const recipientResult = await marketplaceService.updateFeeRecipient(feeRecipient);
                if (recipientResult.success) {
                    results.feeRecipient = feeRecipient;
                    results.recipientTransactionHash = recipientResult.transactionHash;
                    results.recipientGasUsed = recipientResult.gasUsed;
                }
            }
            await db_1.models.nftActivity.create({
                tokenId: undefined,
                collectionId: undefined,
                listingId: undefined,
                type: "TRANSFER",
                fromUserId: user.id,
                toUserId: undefined,
                price: undefined,
                currency: undefined,
                transactionHash: results.feeTransactionHash || results.recipientTransactionHash,
                metadata: JSON.stringify({
                    actionType: "MARKETPLACE_CONFIG_UPDATED",
                    chain: chain.toUpperCase(),
                    contractAddress,
                    updatedFields: {
                        ...(feePercentage !== undefined && { feePercentage }),
                        ...(feeRecipient && { feeRecipient })
                    }
                })
            }, { transaction: dbTransaction });
            await dbTransaction.commit();
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Marketplace configuration updated successfully");
            return {
                message: "Marketplace configuration updated successfully",
                data: results
            };
        }
        catch (dbError) {
            await dbTransaction.rollback();
            throw dbError;
        }
    }
    catch (error) {
        console_1.logger.error("UPDATE_MARKETPLACE_CONFIG", "Failed to update marketplace configuration", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to update marketplace configuration"
        });
    }
};
