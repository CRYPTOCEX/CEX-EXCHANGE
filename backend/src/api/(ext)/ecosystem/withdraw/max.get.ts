import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { getEcosystemToken } from "@b/api/(ext)/ecosystem/utils/tokens";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
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
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Wallet or Token"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { query, user, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { currency, chain } = query;

  ctx?.step("Validating request parameters");
  if (!currency || !chain) {
    ctx?.fail("Missing currency or chain parameter");
    throw createError({
      statusCode: 400,
      message: "Currency and chain parameters are required",
    });
  }

  try {
    ctx?.step(`Finding wallet for ${currency}`);
    // Find the user's wallet
    const userWallet = await models.wallet.findOne({
      where: { userId: user.id, currency: currency as string, type: "ECO" },
    });

    if (!userWallet) {
      ctx?.fail(`Wallet not found for ${currency}`);
      throw createError({
        statusCode: 404,
        message: "Wallet not found",
      });
    }

    ctx?.step(`Fetching token configuration for ${currency} on ${chain}`);
    // Fetch token settings
    const token = await getEcosystemToken(chain as string, currency as string);
    if (!token) {
      ctx?.fail(`Token not found for ${currency} on ${chain}`);
      throw createError({
        statusCode: 404,
        message: "Token not found",
      });
    }

    ctx?.step("Calculating available balance");
    // For withdrawals, use wallet_data balance (what's available on this specific chain)
    // instead of wallet.balance (total across all chains)
    let availableBalance = userWallet.balance;

    const walletData = await models.walletData.findOne({
      where: {
        walletId: userWallet.id,
        chain: chain as string,
      },
    });

    if (walletData) {
      availableBalance = parseFloat(walletData.balance) || 0;

      // For PERMIT tokens, subtract admin fees from private ledger
      if (token.contractType === "PERMIT") {
        const privateLedger = await models.ecosystemPrivateLedger.findOne({
          where: {
            walletId: userWallet.id,
            index: walletData.index,
            currency: currency as string,
            chain: chain as string,
          },
        });

        if (privateLedger && privateLedger.offchainDifference) {
          const offchainDiff = parseFloat(privateLedger.offchainDifference) || 0;
          // If offchainDifference is positive, admin fees were collected - subtract from available
          availableBalance = availableBalance - offchainDiff;
        }
      }
    }

    ctx?.step("Calculating platform fees");
    // Calculate platform fee
    let platformFee = 0;
    if (token.fee) {
      const tokenFee = JSON.parse(token.fee as any);
      const percentageFee = tokenFee.percentage ?? 0;
      const minFee = tokenFee.min ?? 0;

      // For max calculation, use the minimum fee
      platformFee = minFee;
    }

    const isUtxoChain = ["BTC", "LTC", "DOGE", "DASH"].includes(chain as string);
    let maxAmount = availableBalance - platformFee;
    let estimatedNetworkFee = 0;
    let utxoInfo: any = null;

    // For NATIVE EVM tokens, estimate gas fee and subtract it from max amount
    const evmChains = ["ETH", "BSC", "POLYGON", "FTM", "OPTIMISM", "ARBITRUM", "BASE", "CELO", "RSK", "AVAX"];
    const isNativeEVM = evmChains.includes(chain as string) && token.contractType === "NATIVE";

    if (isNativeEVM) {
      try {
        const ethers = require("ethers");
        const { initializeProvider } = require("@b/blockchains/evm");

        const provider = await initializeProvider(chain as string);
        const gasPrice = await provider.getFeeData();
        const gasLimit = 21000; // Standard transfer gas limit
        const gasCost = BigInt(gasLimit) * (gasPrice.gasPrice || gasPrice.maxFeePerGas || BigInt(0));
        estimatedNetworkFee = parseFloat(ethers.formatUnits(gasCost, token.decimals));

        // Subtract gas fee from max amount
        maxAmount = maxAmount - estimatedNetworkFee;

        console.log(`[MAX_WITHDRAW] NATIVE EVM gas estimation:`, {
          chain,
          gasLimit,
          gasPrice: gasPrice.gasPrice?.toString() || gasPrice.maxFeePerGas?.toString(),
          estimatedNetworkFee,
          availableBalance,
          platformFee,
          maxAmountAfterFees: maxAmount
        });
      } catch (error) {
        console.error(`[MAX_WITHDRAW] Error estimating EVM gas:`, error.message);
        // Fall back to a conservative estimate (0.0001 for most EVM chains)
        estimatedNetworkFee = 0.0001;
        maxAmount = maxAmount - estimatedNetworkFee;
      }
    }

    // For UTXO chains, calculate the actual maximum withdrawable amount
    if (isUtxoChain && maxAmount > 0) {
      const { calculateMinimumWithdrawal } = require("@b/api/(ext)/ecosystem/utils/utxo");

      try {
        // We need to find the maximum amount we can actually withdraw
        // Start with a high estimate and work down
        let testAmount = maxAmount;
        let validationResult;

        // Binary search for maximum withdrawable amount
        let low = 0;
        let high = maxAmount;
        let bestAmount = 0;
        let bestResult: any = null;

        for (let i = 0; i < 20; i++) { // Max 20 iterations
          testAmount = (low + high) / 2;

          if (testAmount <= 0) break;

          validationResult = await calculateMinimumWithdrawal(
            userWallet.id,
            chain as string,
            testAmount
          );

          if (validationResult.isEconomical) {
            // This amount works, try higher
            bestAmount = testAmount;
            bestResult = validationResult;
            low = testAmount;
          } else {
            // This amount doesn't work, try lower
            high = testAmount;
          }

          // If we're within 0.00000001, we're done
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

          // Estimate network fee based on the difference
          estimatedNetworkFee = availableBalance - platformFee - maxAmount;
        } else {
          // No amount works
          maxAmount = 0;
          const lastValidation = await calculateMinimumWithdrawal(
            userWallet.id,
            chain as string,
            0.00000001 // Minimum possible amount
          );
          utxoInfo = {
            utxoCount: lastValidation?.utxoCount || 0,
            reason: lastValidation?.reason || "Insufficient funds for any withdrawal",
          };
        }
      } catch (error) {
        console.error(`[MAX_WITHDRAW] Error calculating UTXO max:`, error.message);
        // Fall back to simple calculation
        maxAmount = Math.max(0, availableBalance - platformFee);
      }
    }

    // Ensure maxAmount is not negative
    maxAmount = Math.max(0, maxAmount);

    ctx?.step("Formatting result");
    // Round to token precision
    const precision = token.precision ?? token.decimals ?? 8;
    maxAmount = parseFloat(maxAmount.toFixed(precision));
    platformFee = parseFloat(platformFee.toFixed(precision));
    estimatedNetworkFee = parseFloat(estimatedNetworkFee.toFixed(precision));

    ctx?.success(`Max withdrawable: ${maxAmount} ${currency} (platform fee: ${platformFee}, network fee: ${estimatedNetworkFee})`);
    return {
      maxAmount,
      platformFee,
      estimatedNetworkFee,
      isUtxoChain,
      utxoInfo,
    };
  } catch (error) {
    console.error(`[MAX_WITHDRAW] Error:`, error);
    ctx?.fail(`Failed to calculate max withdrawal: ${error.message}`);
    throw createError({
      statusCode: 500,
      message: `Failed to calculate maximum withdrawable amount: ${error.message}`,
    });
  }
};
