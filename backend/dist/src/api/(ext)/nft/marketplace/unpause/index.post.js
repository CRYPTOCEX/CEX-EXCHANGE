"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const marketplace_service_1 = require("../../utils/marketplace-service");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Resume NFT marketplace trading",
    operationId: "unpauseNftMarketplace",
    tags: ["NFT", "Marketplace", "Emergency", "Admin"],
    logModule: "NFT",
    logTitle: "Resume Marketplace Trading",
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
                        reason: {
                            type: "string",
                            description: "Reason for resuming the marketplace",
                            maxLength: 500
                        }
                    },
                    required: ["chain", "contractAddress", "reason"]
                }
            }
        }
    },
    responses: {
        200: {
            description: "Marketplace resumed successfully",
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
                                    isPaused: { type: "boolean" },
                                    reason: { type: "string" },
                                    resumedAt: { type: "string" },
                                    gasUsed: { type: "string" },
                                    pauseDuration: { type: "string" }
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
        409: { description: "Marketplace is not paused" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true,
    permission: "access.nft.admin"
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    const { chain = "ETH", contractAddress, reason } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (!contractAddress || !reason) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Contract address and reason are required"
        });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid contract address format"
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
        const pauseStatus = await cacheManager.getSetting(`nft_marketplace_paused_${chain.toLowerCase()}`);
        if (!pauseStatus || pauseStatus !== "true") {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `Marketplace is not currently paused for ${chain}`
            });
        }
        const pauseDetails = await cacheManager.getSetting(`nft_marketplace_pause_reason_${chain.toLowerCase()}`);
        let pauseDuration = "Unknown";
        if (pauseDetails) {
            try {
                const pauseInfo = JSON.parse(pauseDetails);
                const pausedAt = new Date(pauseInfo.pausedAt);
                const now = new Date();
                const diffMs = now.getTime() - pausedAt.getTime();
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                pauseDuration = `${diffHours}h ${diffMinutes}m`;
            }
            catch (e) {
            }
        }
        const marketplaceService = await (0, marketplace_service_1.getNFTMarketplaceService)(chain);
        marketplaceService.setMarketplaceAddress(contractAddress);
        const unpauseResult = await marketplaceService.unpauseMarketplace();
        if (!unpauseResult.success) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Failed to unpause marketplace contract"
            });
        }
        const dbTransaction = await db_1.sequelize.transaction();
        try {
            await cacheManager.updateSetting(`nft_marketplace_paused_${chain.toLowerCase()}`, "false", true);
            await cacheManager.updateSetting(`nft_marketplace_pause_reason_${chain.toLowerCase()}`, "", true);
            await db_1.models.nftActivity.create({
                tokenId: undefined,
                collectionId: undefined,
                listingId: undefined,
                type: "TRANSFER",
                fromUserId: user.id,
                toUserId: undefined,
                price: undefined,
                currency: undefined,
                transactionHash: unpauseResult.transactionHash,
                metadata: JSON.stringify({
                    actionType: "MARKETPLACE_RESUMED",
                    chain: chain.toUpperCase(),
                    contractAddress,
                    reason,
                    pauseDuration,
                    emergencyAction: true
                })
            }, { transaction: dbTransaction });
            await dbTransaction.commit();
            console_1.logger.success("NFT_MARKETPLACE_RECOVERY", `Marketplace resumed for ${chain} by admin ${user.id} after ${pauseDuration}: ${reason}`);
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`NFT marketplace resumed successfully on ${chain}`);
            return {
                message: `NFT marketplace resumed successfully on ${chain}`,
                data: {
                    chain: chain.toUpperCase(),
                    contractAddress,
                    transactionHash: unpauseResult.transactionHash,
                    isPaused: false,
                    reason,
                    resumedAt: new Date().toISOString(),
                    gasUsed: unpauseResult.gasUsed,
                    pauseDuration
                }
            };
        }
        catch (dbError) {
            await dbTransaction.rollback();
            throw dbError;
        }
    }
    catch (error) {
        console_1.logger.error("UNPAUSE_MARKETPLACE", "Failed to unpause marketplace", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to unpause marketplace"
        });
    }
};
