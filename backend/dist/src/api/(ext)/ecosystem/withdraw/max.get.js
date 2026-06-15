"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const tokens_1 = require("@b/api/(ext)/ecosystem/utils/tokens");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Get maximum withdrawable amount",
    description: "Calculates the maximum amount that can be withdrawn for a given currency and chain",
    operationId: "getMaxWithdrawable",
    tags: ["Wallet", "Withdrawal"],
    requiresAuth: true,
    logModule: "ECOSYSTEM",
    logTitle: "Calculate maximum withdrawal amount",
    parameters: [
        {
            name: "currency",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Currency code (e.g., BTC, ETH)",
        },
        {
            name: "chain",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Chain/network (e.g., BTC, ETH, BSC)",
        },
    ],
    responses: {
        200: {
            description: "Maximum withdrawable amount calculated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            maxAmount: {
                                type: "number",
                                description: "Maximum amount that can be withdrawn",
                            },
                            platformFee: {
                                type: "number",
                                description: "Platform withdrawal fee",
                            },
                            estimatedNetworkFee: {
                                type: "number",
                                description: "Estimated network transaction fee (0 for UTXO chains until processing)",
                            },
                            isUtxoChain: {
                                type: "boolean",
                                description: "Whether this is a UTXO-based chain",
                            },
                            utxoInfo: {
                                type: "object",
                                description: "Additional UTXO information (only for BTC/LTC/DOGE/DASH)",
                                properties: {
                                    utxoCount: {
                                        type: "number",
                                    },
                                    reason: {
                                        type: "string",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Wallet or Token"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f;
    const { query, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { currency, chain } = query;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating request parameters");
    if (!currency || !chain) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing currency or chain parameter");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Currency and chain parameters are required",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Finding wallet for ${currency}`);
        const userWallet = await db_1.models.wallet.findOne({
            where: { userId: user.id, currency: currency, type: "ECO" },
        });
        if (!userWallet) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Wallet not found for ${currency}`);
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Wallet not found",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching token configuration for ${currency} on ${chain}`);
        const token = await (0, tokens_1.getEcosystemToken)(chain, currency);
        if (!token) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Token not found for ${currency} on ${chain}`);
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Token not found",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating available balance");
        let availableBalance = Number(userWallet.balance);
        const walletData = await db_1.models.walletData.findOne({
            where: {
                walletId: userWallet.id,
                chain: chain,
            },
        });
        if (walletData) {
            if (token.contractType === "PERMIT") {
                const privateLedger = await db_1.models.ecosystemPrivateLedger.findOne({
                    where: {
                        walletId: userWallet.id,
                        index: walletData.index,
                        currency: currency,
                        chain: chain,
                    },
                });
                if (privateLedger && privateLedger.offchainDifference) {
                    const offchainDiff = Number(privateLedger.offchainDifference) || 0;
                    availableBalance = availableBalance - offchainDiff;
                }
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating platform fees");
        let platformFee = 0;
        let percentageFee = 0;
        let minFee = 0;
        if (token.fee) {
            const tokenFee = JSON.parse(token.fee);
            percentageFee = (_a = tokenFee.percentage) !== null && _a !== void 0 ? _a : 0;
            minFee = (_b = tokenFee.min) !== null && _b !== void 0 ? _b : 0;
        }
        const isUtxoChain = ["BTC", "LTC", "DOGE", "DASH"].includes(chain);
        // Mirror the withdraw endpoint's fee logic (calculateWithdrawalFee in index.post.js):
        // it charges withdrawalFee = Math.max(amount * percentage / 100, min) and rejects when
        // availableBalance < amount + withdrawalFee. Solve for the largest gross "amount" such that
        // amount + Math.max(amount * percentage / 100, min) <= availableBalance.
        // Case 1 (percentage binds): amount = availableBalance / (1 + percentage / 100).
        let candidateAmount = availableBalance / (1 + percentageFee / 100);
        let candidateFee = (candidateAmount * percentageFee) / 100;
        if (candidateFee < minFee) {
            // Case 2 (min fee binds instead): amount = availableBalance - min.
            candidateFee = minFee;
            candidateAmount = availableBalance - minFee;
        }
        platformFee = candidateFee;
        let maxAmount = candidateAmount;
        let estimatedNetworkFee = 0;
        let utxoInfo = null;
        const evmChains = ["ETH", "BSC", "POLYGON", "FTM", "OPTIMISM", "ARBITRUM", "BASE", "CELO", "RSK", "AVAX"];
        const isNativeEVM = evmChains.includes(chain) && token.contractType === "NATIVE";
        if (isNativeEVM) {
            try {
                const ethers = require("ethers");
                const { initializeProvider } = require("@b/blockchains/evm");
                const provider = await initializeProvider(chain);
                const gasPrice = await provider.getFeeData();
                const gasLimit = 21000;
                const gasCost = BigInt(gasLimit) * (gasPrice.gasPrice || gasPrice.maxFeePerGas || BigInt(0));
                estimatedNetworkFee = parseFloat(ethers.formatUnits(gasCost, token.decimals));
                maxAmount = maxAmount - estimatedNetworkFee;
                console.log(`[MAX_WITHDRAW] NATIVE EVM gas estimation:`, {
                    chain,
                    gasLimit,
                    gasPrice: ((_c = gasPrice.gasPrice) === null || _c === void 0 ? void 0 : _c.toString()) || ((_d = gasPrice.maxFeePerGas) === null || _d === void 0 ? void 0 : _d.toString()),
                    estimatedNetworkFee,
                    availableBalance,
                    platformFee,
                    maxAmountAfterFees: maxAmount
                });
            }
            catch (error) {
                console.error(`[MAX_WITHDRAW] Error estimating EVM gas:`, error.message);
                estimatedNetworkFee = 0.0001;
                maxAmount = maxAmount - estimatedNetworkFee;
            }
        }
        if (isUtxoChain && maxAmount > 0) {
            const { calculateMinimumWithdrawal } = require("@b/api/(ext)/ecosystem/utils/utxo");
            try {
                let testAmount = maxAmount;
                let validationResult;
                let low = 0;
                let high = maxAmount;
                let bestAmount = 0;
                let bestResult = null;
                for (let i = 0; i < 20; i++) {
                    testAmount = (low + high) / 2;
                    if (testAmount <= 0)
                        break;
                    validationResult = await calculateMinimumWithdrawal(userWallet.id, chain, testAmount);
                    if (validationResult.isEconomical) {
                        bestAmount = testAmount;
                        bestResult = validationResult;
                        low = testAmount;
                    }
                    else {
                        high = testAmount;
                    }
                    if (Math.abs(high - low) < 0.00000001) {
                        break;
                    }
                }
                if (bestResult && bestResult.utxoCount) {
                    maxAmount = bestAmount;
                    utxoInfo = {
                        utxoCount: bestResult.utxoCount,
                        reason: bestResult.reason,
                    };
                    estimatedNetworkFee = availableBalance - platformFee - maxAmount;
                }
                else {
                    maxAmount = 0;
                    const lastValidation = await calculateMinimumWithdrawal(userWallet.id, chain, 0.00000001);
                    utxoInfo = {
                        utxoCount: (lastValidation === null || lastValidation === void 0 ? void 0 : lastValidation.utxoCount) || 0,
                        reason: (lastValidation === null || lastValidation === void 0 ? void 0 : lastValidation.reason) || "Insufficient funds for any withdrawal",
                    };
                }
            }
            catch (error) {
                console.error(`[MAX_WITHDRAW] Error calculating UTXO max:`, error.message);
                maxAmount = Math.max(0, availableBalance - platformFee);
            }
        }
        maxAmount = Math.max(0, maxAmount);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Formatting result");
        const precision = (_f = (_e = token.precision) !== null && _e !== void 0 ? _e : token.decimals) !== null && _f !== void 0 ? _f : 8;
        // Round DOWN at the given precision so the advertised max is strictly withdrawable
        // (avoid toFixed rounding up and re-introducing the insufficient-funds rejection).
        const precisionFactor = Math.pow(10, precision);
        maxAmount = Math.floor(maxAmount * precisionFactor) / precisionFactor;
        // pass2 #25 refinement: the withdraw endpoint recomputes the percentage fee from this
        // amount and rounds it to-nearest, which can nudge (amount + fee) one ulp over the
        // balance and reject the advertised max. Drop one precision unit when a percentage fee
        // applies so the max always round-trips as withdrawable.
        if (percentageFee > 0 && maxAmount > 0) {
            maxAmount = Math.max(0, maxAmount - (1 / precisionFactor));
            maxAmount = Math.floor(maxAmount * precisionFactor) / precisionFactor;
        }
        maxAmount = parseFloat(maxAmount.toFixed(precision));
        platformFee = parseFloat(platformFee.toFixed(precision));
        estimatedNetworkFee = parseFloat(estimatedNetworkFee.toFixed(precision));
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Max withdrawable: ${maxAmount} ${currency} (platform fee: ${platformFee}, network fee: ${estimatedNetworkFee})`);
        return {
            maxAmount,
            platformFee,
            estimatedNetworkFee,
            isUtxoChain,
            utxoInfo,
        };
    }
    catch (error) {
        console.error(`[MAX_WITHDRAW] Error:`, error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to calculate max withdrawal: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to calculate maximum withdrawable amount: ${error.message}`,
        });
    }
};
