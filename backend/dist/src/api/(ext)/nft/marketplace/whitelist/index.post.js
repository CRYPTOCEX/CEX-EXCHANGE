"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const marketplace_service_1 = require("../../utils/marketplace-service");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Manage NFT collection whitelist for marketplace",
    operationId: "manageMarketplaceWhitelist",
    tags: ["NFT", "Marketplace", "Whitelist", "Admin"],
    logModule: "NFT",
    logTitle: "Manage Marketplace Whitelist",
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
                        marketplaceAddress: {
                            type: "string",
                            description: "Marketplace contract address"
                        },
                        nftContract: {
                            type: "string",
                            description: "NFT collection contract address"
                        },
                        supported: {
                            type: "boolean",
                            description: "Whether to add (true) or remove (false) collection from whitelist"
                        },
                        reason: {
                            type: "string",
                            description: "Reason for whitelist change",
                            maxLength: 500
                        }
                    },
                    required: ["chain", "marketplaceAddress", "nftContract", "supported", "reason"]
                }
            }
        }
    },
    responses: {
        200: {
            description: "Collection whitelist updated successfully",
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
                                    marketplaceAddress: { type: "string" },
                                    nftContract: { type: "string" },
                                    supported: { type: "boolean" },
                                    transactionHash: { type: "string" },
                                    reason: { type: "string" },
                                    updatedAt: { type: "string" },
                                    gasUsed: { type: "string" },
                                    collectionName: { type: "string" }
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
        404: { description: "Marketplace or collection not found" },
        409: { description: "Collection already in requested state" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true,
    permission: "access.nft.admin"
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    const { chain = "ETH", marketplaceAddress, nftContract, supported, reason } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!marketplaceAddress || !nftContract || !reason) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Marketplace address, NFT contract, and reason are required"
        });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(marketplaceAddress)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid marketplace address format"
        });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(nftContract)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid NFT contract address format"
        });
    }
    if (typeof supported !== "boolean") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Supported field must be a boolean"
        });
    }
    try {
        const cacheManager = cache_1.CacheManager.getInstance();
        const storedMarketplaceAddress = await cacheManager.getSetting(`nft_marketplace_address_${chain.toLowerCase()}`);
        if (!storedMarketplaceAddress || storedMarketplaceAddress !== marketplaceAddress) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: `Marketplace contract not found for ${chain}`
            });
        }
        const collection = await db_1.models.nftCollection.findOne({
            where: {
                contractAddress: nftContract,
                chain: chain.toUpperCase()
            }
        });
        if (!collection) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: `NFT collection not found: ${nftContract} on ${chain}`
            });
        }
        if (collection.marketplaceApproved === supported) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `Collection is already ${supported ? 'approved' : 'not approved'} for marketplace`
            });
        }
        const marketplaceService = await (0, marketplace_service_1.getNFTMarketplaceService)(chain);
        marketplaceService.setMarketplaceAddress(marketplaceAddress);
        const whitelistResult = await marketplaceService.updateSupportedTokenStandard([nftContract]);
        if (!whitelistResult.success) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Failed to update collection whitelist on blockchain"
            });
        }
        const dbTransaction = await db_1.sequelize.transaction();
        try {
            await collection.update({
                marketplaceApproved: supported,
                approvedAt: supported ? new Date() : null,
                approvedBy: supported ? user.id : null
            }, { transaction: dbTransaction });
            await db_1.models.nftActivity.create({
                tokenId: undefined,
                collectionId: collection.id,
                listingId: undefined,
                type: "COLLECTION_CREATED",
                fromUserId: user.id,
                toUserId: undefined,
                price: undefined,
                currency: undefined,
                transactionHash: whitelistResult.transactionHash,
                metadata: JSON.stringify({
                    chain: chain.toUpperCase(),
                    marketplaceAddress,
                    nftContract,
                    collectionName: collection.name,
                    supported,
                    reason,
                    adminAction: true
                })
            }, { transaction: dbTransaction });
            if (supported) {
                const approvedCountKey = `nft_approved_collections_${chain.toLowerCase()}`;
                const currentCount = await cacheManager.getSetting(approvedCountKey);
                const newCount = (parseInt(currentCount || "0") + 1).toString();
                await cacheManager.updateSetting(approvedCountKey, newCount, true);
            }
            await dbTransaction.commit();
            const action = supported ? "APPROVED" : "REMOVED";
            console_1.logger.info("NFT_MARKETPLACE_WHITELIST", `Collection ${collection.name} (${nftContract}) ${action} for ${chain} marketplace by admin ${user.id}: ${reason}`);
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Collection ${supported ? 'added to' : 'removed from'} marketplace whitelist successfully`);
            return {
                message: `Collection ${supported ? 'added to' : 'removed from'} marketplace whitelist successfully`,
                data: {
                    chain: chain.toUpperCase(),
                    marketplaceAddress,
                    nftContract,
                    supported,
                    transactionHash: whitelistResult.transactionHash,
                    reason,
                    updatedAt: new Date().toISOString(),
                    gasUsed: whitelistResult.gasUsed,
                    collectionName: collection.name
                }
            };
        }
        catch (dbError) {
            await dbTransaction.rollback();
            throw dbError;
        }
    }
    catch (error) {
        console_1.logger.error("MANAGE_MARKETPLACE_WHITELIST", "Failed to manage marketplace whitelist", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to manage marketplace whitelist"
        });
    }
};
