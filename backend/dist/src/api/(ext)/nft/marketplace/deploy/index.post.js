"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const marketplace_service_1 = require("../../utils/marketplace-service");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Deploy NFT marketplace contract",
    operationId: "deployNftMarketplace",
    tags: ["NFT", "Marketplace", "Deploy", "Blockchain"],
    logModule: "NFT",
    logTitle: "Deploy Marketplace Contract",
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
                        feeRecipient: {
                            type: "string",
                            description: "Address to receive marketplace fees (optional, defaults to master wallet)"
                        },
                        feePercentage: {
                            type: "number",
                            description: "Marketplace fee percentage (default 2.5%)",
                            default: 2.5,
                            minimum: 0,
                            maximum: 10
                        },
                        listingFee: {
                            type: "number",
                            description: "Fixed fee in native token charged when listing an NFT (default 0)",
                            default: 0,
                            minimum: 0
                        },
                        maxRoyaltyPercentage: {
                            type: "number",
                            description: "Maximum royalty percentage creators can set (default 10%)",
                            default: 10,
                            minimum: 0,
                            maximum: 50
                        },
                        force: {
                            type: "boolean",
                            description: "Force redeploy even if marketplace already exists",
                            default: false
                        }
                    },
                    required: []
                }
            }
        }
    },
    responses: {
        200: {
            description: "Marketplace contract deployed successfully",
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
                                    blockNumber: { type: "integer" },
                                    gasUsed: { type: "string" },
                                    deploymentCost: { type: "string" },
                                    feeRecipient: { type: "string" },
                                    feePercentage: { type: "number" }
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
        409: { description: "Marketplace already deployed for this chain" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true,
    permission: "access.nft.admin"
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    const { chain = "ETH", feeRecipient, feePercentage = 2.5, listingFee = 0, maxRoyaltyPercentage = 10, force = false } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (feePercentage < 0 || feePercentage > 10) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Fee percentage must be between 0% and 10%"
        });
    }
    try {
        const existingMarketplace = await db_1.models.nftMarketplace.findOne({
            where: {
                chain: chain.toUpperCase(),
                status: "ACTIVE"
            }
        });
        if (existingMarketplace && !force) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `Marketplace contract already deployed for ${chain}: ${existingMarketplace.contractAddress}. Use 'force: true' to redeploy.`
            });
        }
        if (existingMarketplace && force) {
            console_1.logger.info("NFT_MARKETPLACE", `Force redeploying marketplace for ${chain}. Old address: ${existingMarketplace.contractAddress}`);
        }
        const masterWallet = await db_1.models.ecosystemMasterWallet.findOne({
            where: { chain: chain.toUpperCase(), status: true }
        });
        if (!masterWallet) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: `No active master wallet found for ${chain}. Please set up master wallet first.`
            });
        }
        const finalFeeRecipient = feeRecipient || masterWallet.address;
        if (!/^0x[a-fA-F0-9]{40}$/.test(finalFeeRecipient)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid fee recipient address format"
            });
        }
        const marketplaceService = await (0, marketplace_service_1.getNFTMarketplaceService)(chain);
        const feePercentageBasisPoints = Math.floor(feePercentage * 100);
        const deployResult = await marketplaceService.deployMarketplace(finalFeeRecipient, feePercentageBasisPoints, user.id, "mainnet", listingFee, maxRoyaltyPercentage);
        if (!deployResult.success) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Marketplace contract deployment failed" });
        }
        console_1.logger.success("NFT_MARKETPLACE", `Successfully deployed marketplace contract for ${chain}: ${deployResult.contractAddress}`);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`NFT marketplace contract deployed successfully on ${chain}`);
        return {
            message: `NFT marketplace contract deployed successfully on ${chain}`,
            data: {
                chain: chain.toUpperCase(),
                contractAddress: deployResult.contractAddress,
                transactionHash: deployResult.transactionHash,
                blockNumber: deployResult.blockNumber,
                gasUsed: deployResult.gasUsed,
                deploymentCost: deployResult.deploymentCost,
                feeRecipient: finalFeeRecipient,
                feePercentage
            }
        };
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to deploy marketplace contract", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to deploy marketplace contract: ${error.message}`
        });
    }
};
