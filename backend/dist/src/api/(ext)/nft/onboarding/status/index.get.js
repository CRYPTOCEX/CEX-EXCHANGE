"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Get NFT onboarding task completion status",
    operationId: "getNftOnboardingStatus",
    description: "Returns the real completion status of onboarding tasks based on actual system data",
    tags: ["NFT", "Admin", "Onboarding"],
    responses: {
        200: {
            description: "Onboarding status retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            completedTasks: { type: "array", items: { type: "string" } },
                            stats: { type: "object" },
                            marketplaces: { type: "array" }
                        }
                    }
                }
            }
        },
        401: { description: "Unauthorized" },
        500: { description: "Server error" }
    },
    requiresAuth: true,
    permission: "access.nft"
};
exports.default = async (data) => {
    try {
        const cacheManager = cache_1.CacheManager.getInstance();
        const marketplaces = await db_1.models.nftMarketplace.findAll({
            where: {
                status: "ACTIVE"
            },
            attributes: ["chain", "contractAddress", "status", "createdAt"]
        });
        const deployedChains = marketplaces.map(m => m.chain);
        const hasPrimaryMarketplace = marketplaces.length > 0;
        const categoriesCount = await db_1.models.nftCategory.count();
        const hasCategories = categoriesCount >= 2;
        const activeCollections = await db_1.models.nftCollection.count({
            where: {
                status: "ACTIVE"
            }
        });
        const hasApprovedCollections = activeCollections >= 1;
        const collectionsWithTokens = await db_1.models.nftCollection.count({
            where: {
                status: "ACTIVE"
            },
            include: [
                {
                    model: db_1.models.nftToken,
                    as: "tokens",
                    required: true,
                    attributes: []
                }
            ],
            distinct: true
        });
        const hasFeaturedContent = collectionsWithTokens >= 1;
        const verifiedCreators = await db_1.models.nftCreator.count({
            where: {
                isVerified: true
            }
        });
        const hasVerifiedCreators = verifiedCreators >= 1;
        const fixedPriceSales = await cacheManager.getSetting("nftEnableFixedPriceSales");
        const auctions = await cacheManager.getSetting("nftEnableAuctions");
        const offers = await cacheManager.getSetting("nftEnableOffers");
        const tradingConfigured = fixedPriceSales !== null && fixedPriceSales !== undefined &&
            auctions !== null && auctions !== undefined &&
            offers !== null && offers !== undefined;
        const metadataValidation = await cacheManager.getSetting("nftRequireMetadataValidation");
        const contentConfigured = metadataValidation !== null && metadataValidation !== undefined;
        const requireKycForCreators = await cacheManager.getSetting("nftRequireKycForCreators");
        const verificationConfigured = requireKycForCreators !== null && requireKycForCreators !== undefined;
        const completedTasks = [];
        if (hasPrimaryMarketplace) {
            completedTasks.push("deploy-primary-marketplace");
            completedTasks.push("verify-blockchain-health");
        }
        if (tradingConfigured) {
            completedTasks.push("configure-trading-settings");
        }
        if (contentConfigured) {
            completedTasks.push("setup-content-policies");
        }
        if (verificationConfigured) {
            completedTasks.push("configure-verification");
        }
        if (hasCategories) {
            completedTasks.push("create-categories");
        }
        if (hasApprovedCollections) {
            completedTasks.push("approve-first-collections");
        }
        if (hasFeaturedContent) {
            completedTasks.push("setup-featured-content");
        }
        if (hasVerifiedCreators) {
            completedTasks.push("setup-creator-verification");
        }
        return {
            completedTasks,
            stats: {
                deployedMarketplaces: marketplaces.length,
                deployedChains: deployedChains,
                categoriesCount,
                activeCollections,
                collectionsWithTokens,
                verifiedCreators,
                tradingConfigured,
                contentConfigured,
                verificationConfigured
            },
            marketplaces: marketplaces.map(m => ({
                chain: m.chain,
                address: m.contractAddress,
                deployedAt: m.createdAt
            }))
        };
    }
    catch (error) {
        console_1.logger.error("NFT_ONBOARDING", "Failed to get onboarding status", error);
        throw error;
    }
};
