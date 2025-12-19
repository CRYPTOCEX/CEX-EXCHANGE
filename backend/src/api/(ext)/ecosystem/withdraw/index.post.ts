import { models, sequelize } from "@b/db";
import { Transaction } from "sequelize";
import {
  createPendingTransaction,
  decrementWalletBalance,
  getWalletData,
  validateAddress,
} from "@b/api/(ext)/ecosystem/utils/wallet";
import { createError } from "@b/utils/error";
import { getEcosystemToken } from "@b/api/(ext)/ecosystem/utils/tokens";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import {
  parseAddresses,
  processInternalTransfer,
} from "@b/api/finance/transfer/index.post";
import WithdrawalQueue from "../utils/withdrawalQueue";
import { getTronService, getMoneroService } from "@b/utils/safe-imports";
import { logger } from "@b/utils/console";

// Utility function to count decimal places
function countDecimals(value: number): number {
  if (Number.isInteger(value)) return 0;
  const str = value.toString();
  if (str.includes("e-")) {
    // Handle scientific notation
    const [_, exponent] = str.split("e-");
    return parseInt(exponent, 10);
  }
  const parts = str.split(".");
  return parts[1]?.length || 0;
}

export const metadata: OperationObject = {
  summary: "Withdraws funds to an external address",
  description:
    "Processes a withdrawal from the user's wallet to an external address.",
  operationId: "withdrawFunds",
  tags: ["Wallet", "Withdrawal"],
  requiresAuth: true,
  logModule: "ECO_WITHDRAW",
  logTitle: "Withdraw funds to external address",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            currency: {
              type: "string",
              description: "Currency to withdraw",
            },
            chain: {
              type: "string",
              description: "Withdraw method ID",
            },
            amount: {
              type: "number",
              description: "Amount to withdraw",
            },
            toAddress: {
              type: "string",
              description: "Withdraw toAddress",
            },
          },
          required: ["currency", "chain", "amount", "toAddress"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Withdrawal processed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description:
                  "Success message indicating the withdrawal has been processed.",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Wallet"),
    500: serverErrorResponse,
  },
};

// Input sanitization helper
function sanitizeInput(input: string, maxLength: number = 255): string {
  if (!input || typeof input !== 'string') return '';

  // Remove null bytes, control characters, and excessive whitespace
  let sanitized = input
    .replace(/\0/g, '') // null bytes
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '') // control characters
    .trim();

  // Limit length to prevent buffer overflow attacks
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

// Validate address format (basic alphanumeric check before chain-specific validation)
function validateAddressFormat(address: string): boolean {
  if (!address || typeof address !== 'string') return false;

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /[<>'"]/,           // HTML/XSS characters
    /\$\{.*\}/,         // Template injection
    /\.\.\//,           // Path traversal
    /__proto__|constructor|prototype/i, // Prototype pollution
    /javascript:/i,     // XSS
    /data:/i,           // Data URI XSS
    /on\w+\s*=/i,      // Event handler XSS
    /script|iframe|object|embed/i, // HTML injection
    /union.*select/i,   // SQL injection
    /exec\(|eval\(|system\(/i, // Command injection
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(address)) {
      logger.error("SECURITY", `Suspicious pattern detected in address: ${pattern}`);
      return false;
    }
  }

  // Must contain only valid blockchain address characters
  // Most blockchain addresses use base58, hex, or bech32 (alphanumeric)
  const validAddressPattern = /^[a-zA-Z0-9]+$/;
  return validAddressPattern.test(address);
}

export default async (data: Handler) => {
  const { body, user, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    const { currency: rawCurrency, chain: rawChain, amount, toAddress: rawToAddress } = body;

    ctx?.step("Sanitizing input parameters");
    // Sanitize all string inputs
    const currency = sanitizeInput(rawCurrency, 10);
    const chain = sanitizeInput(rawChain, 20);
    const toAddress = sanitizeInput(rawToAddress, 200);

    ctx?.step("Validating withdrawal request");
    // Validate inputs
    if (!currency || !chain || !toAddress) {
      ctx?.fail("Missing required parameters");
      throw createError({
        statusCode: 400,
        message: "Missing required parameters",
      });
    }

    // Basic address format validation before chain-specific validation
    if (!validateAddressFormat(toAddress)) {
      ctx?.fail("Invalid address format detected");
      throw createError({
        statusCode: 400,
        message: "Invalid address format. Address contains invalid characters or suspicious patterns.",
      });
    }

    logger.info("ECO_WITHDRAW", `Starting withdrawal: userId=${user.id}, currency=${currency}, chain=${chain}, amount=${amount}, toAddress=${toAddress?.substring(0, 10)}...`);

    if (!chain) {
      logger.error("ECO_WITHDRAW", `Chain parameter missing`);
      ctx?.fail("Chain parameter is required");
      throw createError({
        statusCode: 400,
        message: "Chain parameter is required",
      });
    }

    ctx?.step("Validating withdrawal amount");
    // Validate amount is a valid positive number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !isFinite(parsedAmount)) {
      ctx?.fail("Invalid amount provided");
      throw createError({
        statusCode: 400,
        message: "Invalid amount. Must be a positive number.",
      });
    }

    const finalAmount = Math.abs(parsedAmount);

    ctx?.step("Checking if address is internal");
    // Check if the toAddress belongs to an internal user
    logger.debug("ECO_WITHDRAW", `Checking if address is internal...`);
    const recipientWallet = await findWalletByAddress(toAddress);

    if (recipientWallet) {
      // Process as internal transfer
      ctx?.step("Processing as internal transfer");
      logger.info("ECO_WITHDRAW", `Address is internal, processing as transfer`);
      const result = await processInternalTransfer(
        user.id,
        recipientWallet.userId,
        currency,
        chain,
        finalAmount
      );
      ctx?.success(`Internal transfer of ${finalAmount} ${currency} completed`);
      return result;
    } else {
      // Proceed with the regular withdrawal process
      ctx?.step("Processing as external withdrawal");
      logger.info("ECO_WITHDRAW", `Address is external, processing withdrawal`);
      const result = await storeWithdrawal(
        user.id,
        currency,
        chain,
        finalAmount,
        toAddress,
        ctx
      );
      ctx?.success(`Withdrawal of ${finalAmount} ${currency} to ${chain} submitted`);
      return result;
    }
  } catch (error) {
    logger.error("ECO_WITHDRAW", `Error in withdrawal`, error);
    if (error.message === "INSUFFICIENT_FUNDS") {
      logger.debug("ECO_WITHDRAW", "Insufficient funds error");
      ctx?.fail("Insufficient funds");
      throw createError({ statusCode: 400, message: "Insufficient funds" });
    }
    ctx?.fail(`Withdrawal failed: ${error.message}`);
    throw createError({
      statusCode: 500,
      message: `Failed to withdraw: ${error}`,
    });
  }
};

const storeWithdrawal = async (
  userId: string,
  currency: string,
  chain: string,
  amount: number,
  toAddress: string,
  ctx?: any
) => {
  logger.debug("ECO_WITHDRAW", `Starting storeWithdrawal: userId=${userId}, currency=${currency}, chain=${chain}, amount=${amount}, toAddress=${toAddress?.substring(0, 10)}...`);

  if (!chain || typeof chain !== "string") {
    logger.error("ECO_WITHDRAW", `Invalid chain parameter: ${chain}`);
    throw new Error("Invalid or missing chain parameter");
  }

  ctx?.step("Validating withdrawal address");
  // Validate address for non-BTC, LTC, DOGE, and DASH chains
  if (!["BTC", "LTC", "DOGE", "DASH"].includes(chain)) {
    validateAddress(toAddress, chain);
  }

  ctx?.step("Retrieving user wallet");
  // Find the user's wallet (ECO type only - COPY_TRADING wallets cannot withdraw)
  logger.debug("ECO_WITHDRAW", `Looking for wallet: userId=${userId}, currency=${currency}, type=ECO`);
  const userWallet = await models.wallet.findOne({
    where: { userId, currency, type: "ECO" },
  });

  if (!userWallet) {
    logger.error("ECO_WITHDRAW", `Wallet not found for user ${userId}, currency ${currency}`);
    throw new Error("User wallet not found");
  }

  // Additional security check: ensure wallet type is ECO
  if (userWallet.type !== "ECO") {
    logger.error("ECO_WITHDRAW", `Attempted withdrawal from non-ECO wallet: type=${userWallet.type}`);
    throw new Error("Withdrawals are only allowed from ECO wallets");
  }
  logger.debug("ECO_WITHDRAW", `Found wallet: walletId=${userWallet.id}, balance=${userWallet.balance}`);

  ctx?.step("Fetching token configuration");
  // Fetch token settings (like withdrawal fees)
  logger.debug("ECO_WITHDRAW", `Fetching token settings for ${currency} on ${chain}`);
  const token = await getEcosystemToken(chain, currency);
  if (!token) {
    logger.error("ECO_WITHDRAW", `Token not found for ${currency} on ${chain}`);
    throw new Error("Token not found");
  }
  logger.debug("ECO_WITHDRAW", `Token found: currency=${token.currency}, decimals=${token.decimals}, precision=${token.precision}`);

  ctx?.step("Validating amount precision");
  // Validate decimal precision based on token configuration
  const maxPrecision = token.precision ?? token.decimals ?? 8;
  const actualDecimals = countDecimals(amount);

  if (actualDecimals > maxPrecision) {
    throw new Error(
      `Amount has too many decimal places for ${currency} on ${chain}. Max allowed is ${maxPrecision} decimal places. Your amount has ${actualDecimals} decimal places.`
    );
  }

  ctx?.step("Calculating withdrawal fees");
  // Calculate the withdrawal fee based on token settings
  let withdrawalFee: number = 0;
  if (token.fee) {
    const tokenFee = JSON.parse(token.fee as any);
    const currencyWithdrawalFee = tokenFee.percentage ?? 0;
    const minimumWithdrawalFee = tokenFee.min ?? 0;

    withdrawalFee = calculateWithdrawalFee(
      amount,
      currencyWithdrawalFee,
      minimumWithdrawalFee
    );
  }

  // Initialize fees and logic for different chains
  let activationFee = 0;
  let estimatedFee = 0;

  // For NATIVE EVM tokens, estimate gas fee before withdrawal
  const evmChains = ["ETH", "BSC", "POLYGON", "FTM", "OPTIMISM", "ARBITRUM", "BASE", "CELO", "RSK", "AVAX"];
  const isNativeEVM = evmChains.includes(chain) && token.contractType === "NATIVE";

  if (isNativeEVM) {
    ctx?.step(`Estimating gas fees for ${chain}`);
    logger.debug("ECO_WITHDRAW", `Estimating gas for NATIVE ${currency} on ${chain}`);
    try {
      const { initializeProvider } = require("@b/api/(ext)/ecosystem/utils/provider");
      const provider = await initializeProvider(chain);

      // Estimate gas for a simple native transfer
      const gasPrice = await provider.getFeeData();
      const gasLimit = 21000; // Standard gas limit for ETH/EVM native transfers

      // Calculate estimated fee: gasLimit * gasPrice
      const { ethers } = require("ethers");
      const gasCost = BigInt(gasLimit) * (gasPrice.gasPrice || gasPrice.maxFeePerGas || BigInt(0));
      estimatedFee = parseFloat(ethers.formatUnits(gasCost, token.decimals));

      logger.debug("ECO_WITHDRAW", `Estimated gas fee: ${estimatedFee} ${currency}, gasLimit=${gasLimit}, gasPrice=${gasPrice.gasPrice?.toString()}`);
    } catch (error) {
      logger.error("ECO_WITHDRAW", `Failed to estimate gas: ${error.message}`);
      // Use a fallback estimate based on chain
      const fallbackGasFees = {
        ETH: 0.001,
        BSC: 0.0003,
        POLYGON: 0.01,
        ARBITRUM: 0.0001,
        OPTIMISM: 0.0001,
        BASE: 0.0001,
        AVAX: 0.001,
      };
      estimatedFee = fallbackGasFees[chain] || 0.001;
      logger.debug("ECO_WITHDRAW", `Using fallback gas estimate: ${estimatedFee} ${currency}`);
    }
  }

  // Validate UTXO-based withdrawals BEFORE deducting balance
  // Note: We cannot accurately estimate UTXO network fees until transaction building
  // because fees depend on number of UTXOs, current fee rate, and change output
  if (["BTC", "LTC", "DOGE", "DASH"].includes(chain)) {
    ctx?.step(`Validating UTXO withdrawal for ${chain}`);
    logger.debug("ECO_WITHDRAW", `Pre-validating UTXO withdrawal for ${chain}`);
    const { calculateMinimumWithdrawal } = require("@b/api/(ext)/ecosystem/utils/utxo");

    try {
      const validationResult = await calculateMinimumWithdrawal(
        userWallet.id,
        chain,
        amount
      );

      if (!validationResult.isEconomical) {
        logger.error("ECO_WITHDRAW", `Withdrawal not economical: ${validationResult.reason}`);
        throw new Error(validationResult.reason);
      }

      logger.debug("ECO_WITHDRAW", `UTXO validation passed: withdrawal requires ${validationResult.utxoCount} UTXOs`);

      // Note: estimatedFee remains 0 for UTXO chains
      // Actual network fee will be calculated and deducted during transaction processing
    } catch (error) {
      logger.error("ECO_WITHDRAW", `UTXO validation error: ${error.message}`);
      throw error;
    }
  } else if (chain === "TRON") {
    ctx?.step("Estimating TRON transaction fees");
    // Handle Tron-specific logic
    const TronService = await getTronService();
    if (!TronService) {
      throw new Error("Tron service not available");
    }
    const tronService = await TronService.getInstance();

    // Check if the recipient address is activated
    const isActivated = await tronService.isAddressActivated(toAddress);

    if (!isActivated) {
      activationFee = 1; // 1 TRX required to activate a new account
    }

    // Get wallet data (private key, etc.)
    const walletData = await getWalletData(userWallet.id, chain);
    if (!walletData) {
      throw new Error("Wallet data not found");
    }

    // Fetch the user's Tron address
    const addresses =
      typeof userWallet.address === "string"
        ? JSON.parse(userWallet.address)
        : userWallet.address;
    const fromAddress = addresses[chain].address;

    // Convert amount to Sun (TRX's smaller unit)
    const amountSun = Math.round(amount * 1e6);

    // Estimate the transaction fee
    const estimatedFeeSun = await tronService.estimateTransactionFee(
      fromAddress,
      toAddress,
      amountSun
    );

    estimatedFee = estimatedFeeSun / 1e6; // Convert Sun to TRX
  } else if (chain === "XMR") {
    ctx?.step("Estimating Monero transaction fees");
    // Handle Monero-specific logic
    const MoneroService = await getMoneroService();
    if (!MoneroService) {
      throw new Error("Monero service not available");
    }
    const moneroService = await MoneroService.getInstance();
    estimatedFee = await moneroService.estimateMoneroFee();
  }

  ctx?.step("Calculating total fees and amounts");
  // Calculate the total fee for the transaction
  // For NATIVE EVM tokens, gas is paid FROM the withdrawal amount (not added on top)
  // For other chains, gas/network fees are added on top of the withdrawal amount
  const totalFee = isNativeEVM
    ? withdrawalFee + activationFee  // Gas is paid from withdrawal, don't add it
    : withdrawalFee + activationFee + estimatedFee;  // Other chains: add network fee

  // Calculate the total amount to deduct from the wallet (including fees)
  // Use parseFloat with toFixed to prevent floating-point precision errors
  const precision = token.precision ?? token.decimals ?? 8;
  const totalAmount = parseFloat((amount + totalFee).toFixed(precision));

  logger.debug("ECO_WITHDRAW", `Fee calculation: withdrawAmount=${amount}, withdrawalFee=${withdrawalFee}, activationFee=${activationFee}, estimatedNetworkFee=${estimatedFee}, totalFee=${totalFee}, totalToDeduct=${totalAmount}`);

  ctx?.step("Verifying balance and creating withdrawal transaction");
  // Use database transaction with row-level locking to prevent race conditions
  // This ensures that when multiple withdrawals happen simultaneously for the same wallet,
  // each one gets exclusive access to the wallet balance
  let transaction;
  await sequelize.transaction(
    {
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    },
    async (dbTransaction) => {
      // Lock the wallet row using FOR UPDATE
      // This prevents other concurrent withdrawals from reading the balance until we're done
      const lockedWallet = await models.wallet.findOne({
        where: { id: userWallet.id },
        lock: Transaction.LOCK.UPDATE,
        transaction: dbTransaction,
      });

      if (!lockedWallet) {
        throw new Error("Wallet not found");
      }

      // For chain-specific withdrawals, check wallet_data balance (what's available on this chain)
      // instead of wallet.balance (which is total across all chains)
      const lockedWalletData = await models.walletData.findOne({
        where: {
          walletId: userWallet.id,
          chain: chain,
        },
        lock: Transaction.LOCK.UPDATE,
        transaction: dbTransaction,
      });

      let availableBalance = lockedWalletData
        ? parseFloat(lockedWalletData.balance)
        : lockedWallet.balance;

      // For PERMIT tokens, check private ledger and subtract admin fees
      if (token.contractType === "PERMIT" && lockedWalletData) {
        const privateLedger = await models.ecosystemPrivateLedger.findOne({
          where: {
            walletId: userWallet.id,
            index: lockedWalletData.index,
            currency: currency,
            chain: chain,
          },
          transaction: dbTransaction,
        });

        if (privateLedger && privateLedger.offchainDifference) {
          const offchainDiff = parseFloat(privateLedger.offchainDifference) || 0;
          // If offchainDifference is positive, it means admin fees were collected
          // Subtract from available balance
          availableBalance = availableBalance - offchainDiff;

          logger.debug("ECO_WITHDRAW", `PERMIT token - adjusted for private ledger: walletDataBalance=${lockedWalletData.balance}, offchainDifference=${offchainDiff}, adjustedAvailableBalance=${availableBalance}`);
        }
      }

      logger.debug("ECO_WITHDRAW", `Balance check: walletBalance=${lockedWallet.balance}, walletDataBalance=${lockedWalletData?.balance}, contractType=${token.contractType}, availableBalance=${availableBalance}, totalRequired=${totalAmount}`);

      // Check balance with the chain-specific available balance
      if (availableBalance < totalAmount) {
        logger.error("ECO_WITHDRAW", `Insufficient funds: available ${availableBalance} < required ${totalAmount}`);
        throw new Error("Insufficient funds");
      }

      // Deduct the total amount from the user's wallet balance
      // Pass dbTransaction to ensure atomic operation within the same transaction
      await decrementWalletBalance(lockedWallet, chain, totalAmount, dbTransaction);

      // Create the pending transaction within the same database transaction
      transaction = await createPendingTransaction(
        userId,
        lockedWallet.id,
        currency,
        chain,
        amount,
        toAddress,
        totalFee,
        token,
        dbTransaction
      );

      // Refresh userWallet.balance for response
      userWallet.balance = lockedWallet.balance - totalAmount;
    }
  );

  ctx?.step("Adding transaction to withdrawal queue");
  // Add the transaction to the withdrawal queue
  const withdrawalQueue = WithdrawalQueue.getInstance();
  withdrawalQueue.addTransaction(transaction.id);

  // Return updated wallet balance for immediate UI update
  return {
    transaction: transaction.get({ plain: true }),
    balance: userWallet.balance,
    method: chain,
    currency,
    message: "Withdrawal request submitted successfully",
    walletUpdate: {
      currency,
      balance: userWallet.balance,
      type: "ECO"
    }
  };
};

const calculateWithdrawalFee = (
  amount,
  currencyWithdrawalFee,
  minimumWithdrawalFee
) => {
  const calculatedFee = (amount * currencyWithdrawalFee) / 100;
  return Math.max(calculatedFee, minimumWithdrawalFee);
};

async function findWalletByAddress(toAddress: string) {
  const wallets = await models.wallet.findAll({
    where: {
      type: "ECO",
    },
  });

  for (const wallet of wallets) {
    const addresses = parseAddresses(wallet.address);
    for (const chain in addresses) {
      if (addresses[chain].address === toAddress) {
        return wallet;
      }
    }
  }
  return null;
}
