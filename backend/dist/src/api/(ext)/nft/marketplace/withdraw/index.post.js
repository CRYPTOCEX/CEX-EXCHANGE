"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const marketplace_service_1 = require("../../utils/marketplace-service");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Withdraw accumulated marketplace fees",
    operationId: "withdrawMarketplaceFees",
    tags: ["NFT", "Marketplace", "Withdraw", "Admin"],
    logModule: "NFT",
    logTitle: "Withdraw Marketplace Fees",
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
                        amount: {
                            type: "string",
                            description: "Amount to withdraw (optional - withdraws all available if not specified)"
                        },
                        withdrawalAddress: {
                            type: "string",
                            description: "Address to withdraw to (optional - uses fee recipient if not specified)"
                        },
                        reason: {
                            type: "string",
                            description: "Reason for withdrawal",
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
            description: "Marketplace fees withdrawn successfully",
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
                                    withdrawnAmount: { type: "string" },
                                    withdrawalAddress: { type: "string" },
                                    reason: { type: "string" },
                                    withdrawnAt: { type: "string" },
                                    gasUsed: { type: "string" },
                                    gasFee: { type: "string" },
                                    remainingBalance: { type: "string" }
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
        409: { description: "Insufficient balance for withdrawal" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true,
    permission: "access.nft.admin"
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    const { chain = "ETH", contractAddress, amount, withdrawalAddress, reason } = body;
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
    if (withdrawalAddress && !/^0x[a-fA-F0-9]{40}$/.test(withdrawalAddress)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid withdrawal address format"
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
        const currentBalance = await marketplaceService.getContractBalance();
        const balanceNumber = parseFloat(currentBalance);
        if (balanceNumber <= 0) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: "No funds available for withdrawal"
            });
        }
        let withdrawAmount = amount;
        if (amount) {
            const amountNumber = parseFloat(amount);
            if (amountNumber <= 0 || amountNumber > balanceNumber) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Invalid withdrawal amount. Available balance: ${currentBalance}`
                });
            }
        }
        else {
            withdrawAmount = currentBalance;
        }
        let finalWithdrawalAddress = withdrawalAddress;
        if (!finalWithdrawalAddress) {
            finalWithdrawalAddress = await marketplaceService.getFeeRecipient();
        }
        const withdrawResult = await marketplaceService.withdrawBalance(withdrawAmount, finalWithdrawalAddress);
        if (!withdrawResult.success) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Failed to withdraw marketplace funds"
            });
        }
        const remainingBalance = await marketplaceService.getContractBalance();
        const dbTransaction = await db_1.sequelize.transaction();
        try {
            await db_1.models.nftActivity.create({
                tokenId: undefined,
                collectionId: undefined,
                listingId: undefined,
                type: "TRANSFER",
                fromUserId: user.id,
                toUserId: undefined,
                price: parseFloat(withdrawAmount),
                currency: getCurrencySymbol(chain),
                transactionHash: withdrawResult.transactionHash,
                metadata: JSON.stringify({
                    actionType: "MARKETPLACE_WITHDRAWAL",
                    chain: chain.toUpperCase(),
                    contractAddress,
                    withdrawnAmount: withdrawAmount,
                    withdrawalAddress: finalWithdrawalAddress,
                    reason,
                    remainingBalance,
                    adminWithdrawal: true
                })
            }, { transaction: dbTransaction });
            const statsKey = `nft_marketplace_total_withdrawn_${chain.toLowerCase()}`;
            const currentTotal = await cacheManager.getSetting(statsKey);
            const newTotal = (parseFloat(currentTotal || "0") + parseFloat(withdrawAmount)).toString();
            await cacheManager.updateSetting(statsKey, newTotal, true);
            await dbTransaction.commit();
            console_1.logger.info("NFT_MARKETPLACE_WITHDRAWAL", `${withdrawAmount} ${getCurrencySymbol(chain)} withdrawn from ${chain} marketplace by admin ${user.id}: ${reason}`);
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Marketplace fees withdrawn successfully from ${chain}`);
            return {
                message: `Marketplace fees withdrawn successfully from ${chain}`,
                data: {
                    chain: chain.toUpperCase(),
                    contractAddress,
                    transactionHash: withdrawResult.transactionHash,
                    withdrawnAmount: withdrawAmount,
                    withdrawalAddress: finalWithdrawalAddress,
                    reason,
                    withdrawnAt: new Date().toISOString(),
                    gasUsed: withdrawResult.gasUsed,
                    gasFee: withdrawResult.gasFee,
                    remainingBalance
                }
            };
        }
        catch (dbError) {
            await dbTransaction.rollback();
            throw dbError;
        }
    }
    catch (error) {
        console_1.logger.error("WITHDRAW_MARKETPLACE_FEES", "Failed to withdraw marketplace fees", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to withdraw marketplace fees"
        });
    }
};
function getCurrencySymbol(chain) {
    const currencyMap = {
        ETH: "ETH",
        BSC: "BNB",
        POLYGON: "MATIC",
        ARBITRUM: "ETH",
        OPTIMISM: "ETH",
        AVALANCHE: "AVAX",
        FANTOM: "FTM"
    };
    return currencyMap[chain.toUpperCase()] || "ETH";
}
