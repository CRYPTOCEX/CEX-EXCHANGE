"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get NFT marketplace onboarding status",
    operationId: "getNftOnboardingStatus",
    tags: ["NFT", "Admin", "Onboarding"],
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Onboarding Status",
    responses: {
        200: {
            description: "Onboarding status retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    infrastructure: {
                                        type: "object",
                                        properties: {
                                            marketplacesDeployed: { type: "number" },
                                            chainsActive: { type: "array", items: { type: "string" } },
                                            totalContracts: { type: "number" }
                                        }
                                    },
                                    configuration: {
                                        type: "object",
                                        properties: {
                                            feesConfigured: { type: "boolean" },
                                            settingsComplete: { type: "boolean" },
                                            policiesSet: { type: "boolean" }
                                        }
                                    },
                                    content: {
                                        type: "object",
                                        properties: {
                                            categoriesCreated: { type: "number" },
                                            collectionsApproved: { type: "number" },
                                            featuredContentSet: { type: "boolean" }
                                        }
                                    },
                                    users: {
                                        type: "object",
                                        properties: {
                                            verificationEnabled: { type: "boolean" },
                                            rolesConfigured: { type: "boolean" },
                                            kycEnabled: { type: "boolean" }
                                        }
                                    },
                                    readiness: {
                                        type: "object",
                                        properties: {
                                            overallScore: { type: "number" },
                                            criticalTasksRemaining: { type: "number" },
                                            isLaunchReady: { type: "boolean" },
                                            nextActions: { type: "array", items: { type: "string" } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - Admin access required" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true
};
exports.default = async (data) => {
    var _a, _b;
    const { user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching NFT onboarding status");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (user.roleId !== 1) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Admin access required to view onboarding status"
        });
    }
    try {
        const supportedChains = ["ETH", "BSC", "POLYGON", "ARBITRUM", "OPTIMISM"];
        const marketplaceContracts = await Promise.all(supportedChains.map(async (chain) => {
            const contract = await db_1.models.settings.findOne({
                where: { key: `nft_marketplace_address_${chain.toLowerCase()}` }
            });
            return contract ? { chain, address: contract.value } : null;
        }));
        const activeContracts = marketplaceContracts.filter(Boolean);
        const chainsActive = activeContracts.map(c => c.chain);
        const feeSettings = await db_1.models.settings.findOne({
            where: { key: 'nft_marketplace_fee_percentage' }
        });
        const generalSettings = await db_1.models.settings.count({
            where: {
                key: {
                    [sequelize_1.Op.like]: 'nft_%'
                }
            }
        });
        const categoriesCount = ((_b = await ((_a = db_1.models.nftCategory) === null || _a === void 0 ? void 0 : _a.count())) !== null && _b !== void 0 ? _b : 0);
        const approvedCollections = await db_1.models.nftCollection.count({
            where: { status: "ACTIVE" }
        });
        const featuredCollections = await db_1.models.nftCollection.count({
            where: { isVerified: true }
        });
        const verificationEnabled = await db_1.models.settings.findOne({
            where: { key: 'nft_creator_verification_enabled' }
        });
        const kycEnabled = await db_1.models.settings.findOne({
            where: { key: 'kyc_enabled' }
        });
        const checks = {
            marketplaceDeployed: activeContracts.length > 0,
            multiChainDeployed: activeContracts.length > 1,
            feesConfigured: !!feeSettings,
            settingsComplete: generalSettings > 5,
            categoriesCreated: categoriesCount > 0,
            collectionsApproved: approvedCollections > 0,
            featuredContent: featuredCollections > 0,
            verificationSetup: !!verificationEnabled
        };
        const completedChecks = Object.values(checks).filter(Boolean).length;
        const totalChecks = Object.keys(checks).length;
        const overallScore = Math.round((completedChecks / totalChecks) * 100);
        const criticalTasks = [];
        if (!checks.marketplaceDeployed)
            criticalTasks.push("Deploy marketplace contract");
        if (!checks.feesConfigured)
            criticalTasks.push("Configure marketplace fees");
        if (!checks.categoriesCreated)
            criticalTasks.push("Create NFT categories");
        if (!checks.collectionsApproved)
            criticalTasks.push("Approve first collections");
        const isLaunchReady = overallScore >= 80 && criticalTasks.length === 0;
        const nextActions = criticalTasks.length > 0
            ? criticalTasks.slice(0, 3)
            : [
                "Test marketplace functionality",
                "Set up monitoring and analytics",
                "Prepare launch marketing"
            ];
        ctx === null || ctx === void 0 ? void 0 : ctx.success("NFT onboarding status retrieved successfully");
        return {
            message: "Onboarding status retrieved successfully",
            data: {
                infrastructure: {
                    marketplacesDeployed: activeContracts.length,
                    chainsActive,
                    totalContracts: activeContracts.length
                },
                configuration: {
                    feesConfigured: !!feeSettings,
                    settingsComplete: generalSettings > 5,
                    policiesSet: generalSettings > 10
                },
                content: {
                    categoriesCreated: categoriesCount,
                    collectionsApproved: approvedCollections,
                    featuredContentSet: featuredCollections > 0
                },
                users: {
                    verificationEnabled: !!verificationEnabled,
                    rolesConfigured: true,
                    kycEnabled: !!kycEnabled
                },
                readiness: {
                    overallScore,
                    criticalTasksRemaining: criticalTasks.length,
                    isLaunchReady,
                    nextActions
                }
            }
        };
    }
    catch (error) {
        console_1.logger.error("GET_NFT_ONBOARDING_STATUS", "Failed to retrieve onboarding status", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to retrieve onboarding status"
        });
    }
};
