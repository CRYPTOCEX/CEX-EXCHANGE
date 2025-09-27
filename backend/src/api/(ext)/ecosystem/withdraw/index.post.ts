import { models } from "@b/db";
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

export default async (data: Handler) => {
  const { body, user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    const { currency, chain, amount, toAddress } = body;

    console.log(`[ECO_WITHDRAW] Starting withdrawal process:`, {
      userId: user.id,
      currency,
      chain,
      amount,
      toAddress: toAddress?.substring(0, 10) + '...'
    });

    if (!chain) {
      console.error(`[ECO_WITHDRAW] Chain parameter missing`);
      throw createError({
        statusCode: 400,
        message: "Chain parameter is required",
      });
    }
    const parsedAmount = Math.abs(parseFloat(amount));

    // Check if the toAddress belongs to an internal user
    console.log(`[ECO_WITHDRAW] Checking if address is internal...`);
    const recipientWallet = await findWalletByAddress(toAddress);

    if (recipientWallet) {
      // Process as internal transfer
      console.log(`[ECO_WITHDRAW] Address is internal, processing as transfer`);
      return await processInternalTransfer(
        user.id,
        recipientWallet.userId,
        currency,
        chain,
        parsedAmount
      );
    } else {
      // Proceed with the regular withdrawal process
      console.log(`[ECO_WITHDRAW] Address is external, processing withdrawal`);
      return await storeWithdrawal(
        user.id,
        currency,
        chain,
        parsedAmount,
        toAddress
      );
    }
  } catch (error) {
    console.error(`[ECO_WITHDRAW] Error in withdrawal:`, error);
    if (error.message === "INSUFFICIENT_FUNDS") {
      console.log("[ECO_WITHDRAW] Insufficient funds error");
      throw createError({ statusCode: 400, message: "Insufficient funds" });
    }
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
  toAddress: string
) => {
  console.log(`[ECO_WITHDRAW_STORE] Starting storeWithdrawal:`, {
    userId,
    currency,
    chain,
    amount,
    toAddress: toAddress?.substring(0, 10) + '...'
  });

  if (!chain || typeof chain !== "string") {
    console.error(`[ECO_WITHDRAW_STORE] Invalid chain parameter:`, chain);
    throw new Error("Invalid or missing chain parameter");
  }

  // Validate address for non-BTC, LTC, DOGE, and DASH chains
  if (!["BTC", "LTC", "DOGE", "DASH"].includes(chain)) {
    validateAddress(toAddress, chain);
  }

  // Find the user's wallet
  console.log(`[ECO_WITHDRAW_STORE] Looking for wallet:`, { userId, currency, type: "ECO" });
  const userWallet = await models.wallet.findOne({
    where: { userId, currency, type: "ECO" },
  });

  if (!userWallet) {
    console.error(`[ECO_WITHDRAW_STORE] Wallet not found for user ${userId}, currency ${currency}`);
    throw new Error("User wallet not found");
  }
  console.log(`[ECO_WITHDRAW_STORE] Found wallet:`, {
    walletId: userWallet.id,
    balance: userWallet.balance
  });

  // Fetch token settings (like withdrawal fees)
  console.log(`[ECO_WITHDRAW_STORE] Fetching token settings for ${currency} on ${chain}`);
  const token = await getEcosystemToken(chain, currency);
  if (!token) {
    console.error(`[ECO_WITHDRAW_STORE] Token not found for ${currency} on ${chain}`);
    throw new Error("Token not found");
  }
  console.log(`[ECO_WITHDRAW_STORE] Token found:`, {
    currency: token.currency,
    decimals: token.decimals,
    precision: token.precision
  });

  // Validate decimal precision based on token configuration
  const maxPrecision = token.precision ?? token.decimals ?? 8;
  const actualDecimals = countDecimals(amount);
  
  if (actualDecimals > maxPrecision) {
    throw new Error(
      `Amount has too many decimal places for ${currency} on ${chain}. Max allowed is ${maxPrecision} decimal places. Your amount has ${actualDecimals} decimal places.`
    );
  }

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

  if (chain === "TRON") {
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
    // Handle Monero-specific logic
    const MoneroService = await getMoneroService();
    if (!MoneroService) {
      throw new Error("Monero service not available");
    }
    const moneroService = await MoneroService.getInstance();
    estimatedFee = await moneroService.estimateMoneroFee();
  }

  // Calculate the total fee for the transaction
  const totalFee = withdrawalFee + activationFee + estimatedFee;

  // Calculate the total amount to deduct from the wallet (including fees)
  const totalAmount = amount + totalFee;

  console.log(`[ECO_WITHDRAW_STORE] Fee calculation:`, {
    withdrawAmount: amount,
    withdrawalFee,
    activationFee,
    estimatedNetworkFee: estimatedFee,
    totalFee,
    totalToDeduct: totalAmount
  });

  if (userWallet.balance < totalAmount) {
    console.error(`[ECO_WITHDRAW_STORE] Insufficient funds: balance ${userWallet.balance} < required ${totalAmount}`);
    throw new Error("Insufficient funds");
  }

  // Deduct the total amount from the user's wallet balance
  await decrementWalletBalance(userWallet, chain, totalAmount);

  // Create the pending transaction
  const transaction = await createPendingTransaction(
    userId,
    userWallet.id,
    currency,
    chain,
    amount,
    toAddress,
    totalFee,
    token
  );

  // Add the transaction to the withdrawal queue
  const withdrawalQueue = WithdrawalQueue.getInstance();
  withdrawalQueue.addTransaction(transaction.id);

  // Return updated wallet balance for immediate UI update
  return {
    transaction: transaction.get({ plain: true }),
    balance: userWallet.balance - totalAmount,
    method: chain,
    currency,
    message: "Withdrawal request submitted successfully",
    walletUpdate: {
      currency,
      balance: userWallet.balance - totalAmount,
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
