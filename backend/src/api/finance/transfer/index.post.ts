import { models, sequelize } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
// Safe import for wallet utils (only available if extension is installed)
async function getWalletByUserIdAndCurrency(userId: string | number, currency: string) {
  try {
    // @ts-ignore - Dynamic import for optional extension
    const module = await import("@b/api/(ext)/ecosystem/utils/wallet");
    return module.getWalletByUserIdAndCurrency(userId, currency);
  } catch (error) {
    throw new Error("Ecosystem wallet extension is not installed or available");
  }
}
import {
  calculateNewBalance,
  calculateTransferFee,
  createTransferTransaction,
  getCurrencyData,
  getSortedChainBalances,
  recordAdminProfit,
  requiresPrivateLedgerUpdate,
  sendTransferEmails,
  updatePrivateLedger,
  updateWalletBalances,
} from "./utils";
import { CacheManager } from "@b/utils/cache";
import {
  getFiatPriceInUSD,
  getSpotPriceInUSD,
  getEcoPriceInUSD,
} from "../currency/utils";

export const metadata: OperationObject = {
  summary: "Performs a transfer transaction",
  description:
    "Initiates a transfer transaction for the currently authenticated user",
  operationId: "createTransfer",
  tags: ["Finance", "Transfer"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            fromType: {
              type: "string",
              description: "The type of wallet to transfer from",
            },
            toType: {
              type: "string",
              description: "The type of wallet to transfer to",
            },
            fromCurrency: {
              type: "string",
              description: "The currency to transfer from",
            },
            toCurrency: {
              type: "string",
              description: "The currency to transfer to",
              nullable: true,
            },
            amount: { type: "number", description: "Amount to transfer" },
            transferType: {
              type: "string",
              description: "Type of transfer: client or wallet",
            },
            clientId: {
              type: "string",
              description: "Client UUID for client transfers",
              nullable: true,
            },
          },
          required: [
            "fromType",
            "toType",
            "amount",
            "fromCurrency",
            "transferType",
          ],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Transfer transaction initiated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string", description: "Success message" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Withdraw Method"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const {
    fromType,
    toType,
    amount,
    transferType,
    clientId,
    fromCurrency,
    toCurrency,
  } = body;

  if (toCurrency === "Select a currency") {
    throw createError({
      statusCode: 400,
      message: "Please select a target currency",
    });
  }

  // Wallet transfers must be between different wallet types
  if (transferType === "wallet" && fromType === toType) {
    throw createError({
      statusCode: 400,
      message: "Wallet transfers must be between different wallet types",
    });
  }

  const userPk = await models.user.findByPk(user.id);
  if (!userPk)
    throw createError({ statusCode: 404, message: "User not found" });

  const fromWallet = await models.wallet.findOne({
    where: {
      userId: user.id,
      currency: fromCurrency,
      type: fromType,
    },
  });
  if (!fromWallet)
    throw createError({ statusCode: 404, message: "Wallet not found" });

  let toWallet: any = null;
  let toUser: any = null;

  if (transferType === "client") {
    ({ toWallet, toUser } = await handleClientTransfer(
      clientId,
      toCurrency || fromCurrency,
      toType || fromType
    ));
  } else {
    toWallet = await handleWalletTransfer(
      user.id,
      fromType,
      toType,
      toCurrency
    );
  }

  const parsedAmount = parseFloat(amount);
  
  // Validate amount
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw createError(400, "Invalid transfer amount");
  }

  const currencyData = await getCurrencyData(fromType, fromCurrency);
  if (!currencyData) throw createError(400, "Invalid wallet type");

  // Calculate fee to check total deduction needed
  const cacheManager = CacheManager.getInstance();
  const settings = await cacheManager.getSettings();
  const walletTransferFeePercentage = settings.get("walletTransferFeePercentage") || 0;
  const transferFeeAmount = calculateTransferFee(parsedAmount, walletTransferFeePercentage);
  const totalDeduction = parsedAmount; // Fee is deducted from the amount, not added

  // Check if wallet has sufficient balance for the transfer
  if (fromWallet.balance < totalDeduction) {
    throw createError(400, "Insufficient balance to cover transfer");
  }

  const transaction = await performTransaction(
    transferType,
    fromWallet,
    toWallet,
    parsedAmount,
    fromCurrency,
    toCurrency,
    user.id,
    toUser?.id,
    fromType,
    toType,
    currencyData
  );

  if (transferType === "client") {
    const userPk = await models.user.findByPk(user.id);
    await sendTransferEmails(
      userPk,
      toUser,
      fromWallet,
      toWallet,
      parsedAmount,
      transaction
    );
  }

  return {
    message: "Transfer initiated successfully",
    fromTransfer: transaction.fromTransfer,
    toTransfer: transaction.toTransfer,
    fromType,
    toType,
    fromCurrency: fromCurrency,
    toCurrency: toCurrency,
  };
};

async function handleClientTransfer(
  clientId: string,
  currency: string,
  walletType: "FIAT" | "SPOT" | "ECO" | "FUTURES"
) {
  if (!clientId)
    throw createError({ statusCode: 400, message: "Client ID is required" });

  const toUser = await models.user.findByPk(clientId);
  if (!toUser)
    throw createError({ statusCode: 404, message: "Target user not found" });

  let toWallet;
  if (walletType === "ECO") {
    try {
      toWallet = await getWalletByUserIdAndCurrency(clientId, currency);
    } catch (error) {
      // If ECO extension is not available, fall back to regular wallet lookup/creation
      console.warn("ECO extension not available, falling back to regular wallet:", error.message);
      
      toWallet = await models.wallet.findOne({
        where: { userId: clientId, currency, type: walletType },
      });

      if (!toWallet) {
        toWallet = await models.wallet.create({
          userId: clientId,
          currency,
          type: walletType,
          status: true,
        });
      }
    }
  } else {
    toWallet = await models.wallet.findOne({
      where: { userId: clientId, currency, type: walletType },
    });

    if (!toWallet) {
      toWallet = await models.wallet.create({
        userId: clientId,
        currency,
        type: walletType,
        status: true,
      });
    }
  }

  if (!toWallet)
    throw createError({ statusCode: 404, message: "Target wallet not found" });

  return { toWallet, toUser };
}

async function handleWalletTransfer(
  userId: string,
  fromType: "FIAT" | "SPOT" | "ECO" | "FUTURES",
  toType: "FIAT" | "SPOT" | "ECO" | "FUTURES",
  toCurrency: string
) {
  // Check if spot wallets are enabled
  const cacheManager = CacheManager.getInstance();
  const spotWalletsEnabled = await cacheManager.getSetting("spotWallets");
  const isSpotEnabled = spotWalletsEnabled === true || spotWalletsEnabled === "true";
  
  // Prevent SPOT transfers if spot wallets are disabled
  if (!isSpotEnabled && (fromType === "SPOT" || toType === "SPOT")) {
    throw createError(400, "Spot wallet transfers are currently disabled");
  }

  const validTransfers = {
    FIAT: isSpotEnabled ? ["SPOT", "ECO"] : ["ECO"],
    SPOT: ["FIAT", "ECO"],
    ECO: isSpotEnabled ? ["FIAT", "SPOT", "FUTURES"] : ["FIAT", "FUTURES"],
    FUTURES: ["ECO"],
  };

  if (!validTransfers[fromType] || !validTransfers[fromType].includes(toType))
    throw createError(400, "Invalid wallet type transfer");

  // Additional validation for FUTURES wallet type
  if (fromType === "FUTURES" && toType !== "ECO") {
    throw createError(400, "FUTURES wallet can only transfer to ECO wallet");
  }

  let toWallet = await models.wallet.findOne({
    where: { userId, currency: toCurrency, type: toType },
  });
  if (!toWallet) {
    toWallet = await models.wallet.create({
      userId,
      currency: toCurrency,
      type: toType,
      status: true,
    });
  }

  return toWallet;
}

async function performTransaction(
  transferType,
  fromWallet,
  toWallet,
  parsedAmount,
  fromCurrency,
  toCurrency,
  userId,
  clientId,
  fromType,
  toType,
  currencyData
) {
  const cacheManager = CacheManager.getInstance();
  const settings = await cacheManager.getSettings();
  const walletTransferFeePercentage =
    settings.get("walletTransferFeePercentage") || 0;

  const transferFeeAmount = calculateTransferFee(
    parsedAmount,
    walletTransferFeePercentage
  );

  let targetReceiveAmount = parsedAmount - transferFeeAmount;

  // Handle currency conversion if currencies are different
  if (fromCurrency !== toCurrency) {
    // Get exchange rate and validate both currencies have prices
    const exchangeRate = await getExchangeRate(
      fromCurrency,
      fromType,
      toCurrency,
      toType
    );

    // Convert the amount after fee deduction
    targetReceiveAmount = (parsedAmount - transferFeeAmount) * exchangeRate;
  }

  const totalDeducted = parsedAmount;

  if (fromWallet.balance < totalDeducted) {
    throw createError(400, "Insufficient balance to cover transfer and fees.");
  }

  return await sequelize.transaction(async (t) => {
    const requiresLedgerUpdate = requiresPrivateLedgerUpdate(
      transferType,
      fromType,
      toType
    );

    const transferStatus = requiresLedgerUpdate ? "PENDING" : "COMPLETED";

    if (!requiresLedgerUpdate) {
      // For transfers that don't require private ledger updates
      await handleCompleteTransfer({
        fromWallet,
        toWallet,
        parsedAmount,
        targetReceiveAmount,
        transferType,
        fromType,
        fromCurrency,
        currencyData,
        t,
      });
    } else {
      // For transfers that require private ledger updates
      await handlePendingTransfer({
        fromWallet,
        toWallet,
        totalDeducted,
        targetReceiveAmount,
        transferStatus,
        currencyData,
        t,
      });
    }

    const fromTransfer = await createTransferTransaction(
      userId,
      fromWallet.id,
      "OUTGOING_TRANSFER",
      parsedAmount,
      transferFeeAmount,
      fromCurrency,
      toCurrency,
      fromWallet.id,
      toWallet.id,
      `Transfer to ${toType} wallet`,
      transferStatus,
      t
    );

    const toTransfer = await createTransferTransaction(
      transferType === "client" ? clientId! : userId,
      toWallet.id,
      "INCOMING_TRANSFER",
      targetReceiveAmount,
      0,
      fromCurrency,
      toCurrency,
      fromWallet.id,
      toWallet.id,
      `Transfer from ${fromType} wallet`,
      transferStatus,
      t
    );

    if (transferFeeAmount > 0) {
      await recordAdminProfit({
        userId,
        transferFeeAmount,
        fromCurrency,
        fromType,
        toType,
        transactionId: fromTransfer.id,
        t,
      });
    }

    return { fromTransfer, toTransfer };
  });
}

// New helper function for exchange rate calculation with error handling
async function getExchangeRate(
  fromCurrency: string,
  fromType: string,
  toCurrency: string,
  toType: string
): Promise<number> {
  try {
    // Get price in USD for fromCurrency
    let fromPriceUSD: number;
    switch (fromType) {
      case "FIAT":
        fromPriceUSD = await getFiatPriceInUSD(fromCurrency);
        break;
      case "SPOT":
        fromPriceUSD = await getSpotPriceInUSD(fromCurrency);
        break;
      case "ECO":
      case "FUTURES":
        fromPriceUSD = await getEcoPriceInUSD(fromCurrency);
        break;
      default:
        throw createError(400, `Invalid fromType: ${fromType}`);
    }

    // Get price in USD for toCurrency
    let toPriceUSD: number;
    switch (toType) {
      case "FIAT":
        toPriceUSD = await getFiatPriceInUSD(toCurrency);
        break;
      case "SPOT":
        toPriceUSD = await getSpotPriceInUSD(toCurrency);
        break;
      case "ECO":
      case "FUTURES":
        toPriceUSD = await getEcoPriceInUSD(toCurrency);
        break;
      default:
        throw createError(400, `Invalid toType: ${toType}`);
    }

    // Validate prices exist
    if (!fromPriceUSD || fromPriceUSD <= 0) {
      throw createError(
        400,
        `Price not available for ${fromCurrency} in ${fromType} wallet`
      );
    }

    if (!toPriceUSD || toPriceUSD <= 0) {
      throw createError(
        400,
        `Price not available for ${toCurrency} in ${toType} wallet`
      );
    }

    // Calculate exchange rate: how much toCurrency you get per fromCurrency
    const rate = fromPriceUSD / toPriceUSD;

    return rate;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw createError(
      400,
      `Unable to fetch exchange rate between ${fromCurrency} and ${toCurrency}: ${error.message}`
    );
  }
}

async function handleCompleteTransfer({
  fromWallet,
  toWallet,
  parsedAmount,
  targetReceiveAmount,
  transferType,
  fromType,
  fromCurrency,
  currencyData,
  t,
}: any) {
  if (fromType === "ECO" && transferType === "client") {
    await handleEcoClientBalanceTransfer({
      fromWallet,
      toWallet,
      parsedAmount,
      fromCurrency,
      currencyData,
      t,
    });
  } else {
    await handleNonClientTransfer({
      fromWallet,
      toWallet,
      parsedAmount,
      fromCurrency,
      targetReceiveAmount,
      currencyData,
      t,
    });
  }
}

async function handleEcoClientBalanceTransfer({
  fromWallet,
  toWallet,
  parsedAmount,
  fromCurrency,
  currencyData,
  t,
}: any) {
  const fromAddresses = parseAddresses(fromWallet.address);
  const toAddresses = parseAddresses(toWallet.address);

  let remainingAmount = parsedAmount;
  for (const [chain, chainInfo] of getSortedChainBalances(fromAddresses)) {
    if (remainingAmount <= 0) break;

    const transferableAmount = Math.min(
      (chainInfo as { balance: number }).balance,
      remainingAmount
    );

    (chainInfo as { balance: number }).balance -= transferableAmount;
    toAddresses[chain] = toAddresses[chain] || { balance: 0 };
    toAddresses[chain].balance += transferableAmount;

    await updatePrivateLedger(
      fromWallet.id,
      0,
      fromCurrency,
      chain,
      -transferableAmount,
      t
    );
    await updatePrivateLedger(
      toWallet.id,
      0,
      fromCurrency,
      chain,
      transferableAmount,
      t
    );

    remainingAmount -= transferableAmount;
  }

  if (remainingAmount > 0) {
    throw createError(400, "Insufficient chain balance across all addresses.");
  }

  await updateWalletBalances(
    fromWallet,
    toWallet,
    parsedAmount,
    parsedAmount,
    currencyData.precision,
    t
  );
}

async function handleNonClientTransfer({
  fromWallet,
  toWallet,
  parsedAmount,
  fromCurrency,
  targetReceiveAmount,
  currencyData,
  t,
}: any) {
  if (fromWallet.type === "ECO" && toWallet.type === "ECO") {
    const deductionDetails = await deductFromEcoWallet(
      fromWallet,
      parsedAmount,
      fromCurrency,
      t
    );

    await addToEcoWallet(toWallet, deductionDetails, fromCurrency, t);
  }

  await updateWalletBalances(
    fromWallet,
    toWallet,
    parsedAmount,
    targetReceiveAmount,
    currencyData.precision,
    t
  );
}

async function deductFromEcoWallet(
  wallet: any,
  amount: number,
  currency: string,
  t: any
) {
  const addresses = parseAddresses(wallet.address);
  let remainingAmount = amount;
  const deductionDetails: Record<string, any>[] = [];

  for (const chain in addresses) {
    if (
      Object.prototype.hasOwnProperty.call(addresses, chain) &&
      addresses[chain].balance > 0
    ) {
      const transferableAmount = Math.min(
        addresses[chain].balance,
        remainingAmount
      );

      // Deduct the transferable amount from the sender's address balance
      addresses[chain].balance -= transferableAmount;

      // Record the deduction details
      deductionDetails.push({ chain, amount: transferableAmount });

      // Update the private ledger for the wallet
      await updatePrivateLedger(
        wallet.id,
        0,
        currency,
        chain,
        -transferableAmount
      );

      remainingAmount -= transferableAmount;
      if (remainingAmount <= 0) break;
    }
  }

  if (remainingAmount > 0)
    throw createError(
      400,
      "Insufficient chain balance to complete the transfer"
    );

  // Update the wallet with the new addresses and balance
  await wallet.update(
    {
      address: JSON.stringify(addresses),
    },
    { transaction: t }
  );

  // Return the deduction details for use in the addition function
  return deductionDetails;
}

async function addToEcoWallet(
  wallet: any,
  deductionDetails: any[],
  currency: string,
  t: any
) {
  const addresses = parseAddresses(wallet.address);

  for (const detail of deductionDetails) {
    const { chain, amount } = detail;

    // Initialize chain if it doesn't exist
    if (!addresses[chain]) {
      addresses[chain] = {
        address: null, // Set to null or assign a valid address if available
        network: null, // Set to null or assign the appropriate network
        balance: 0,
      };
    }

    // Update the recipient's balance for that chain
    addresses[chain].balance += amount;

    // Update the private ledger for the wallet
    await updatePrivateLedger(wallet.id, 0, currency, chain, amount);
  }

  // Update the wallet with the new addresses and balance
  await wallet.update(
    {
      address: JSON.stringify(addresses),
    },
    { transaction: t }
  );
}

async function handlePendingTransfer({
  fromWallet,
  toWallet,
  totalDeducted,
  targetReceiveAmount,
  transferStatus,
  currencyData,
  t,
}: any) {
  const newFromBalance = calculateNewBalance(
    fromWallet.balance,
    -totalDeducted,
    currencyData
  );
  await fromWallet.update({ balance: newFromBalance }, { transaction: t });

  if (transferStatus === "COMPLETED") {
    const newToBalance = calculateNewBalance(
      toWallet.balance,
      targetReceiveAmount,
      currencyData
    );
    await toWallet.update({ balance: newToBalance }, { transaction: t });
  }
}

export function parseAddresses(address: any): { [key: string]: any } {
  if (!address) {
    return {};
  }

  if (typeof address === "string") {
    try {
      return JSON.parse(address);
    } catch (error) {
      console.error("Failed to parse address JSON:", error);
      return {};
    }
  }

  if (typeof address === "object") {
    return address;
  }

  return {};
}

export async function processInternalTransfer(
  fromUserId: string,
  toUserId: string,
  currency: string,
  chain: string,
  amount: number
) {
  // Fetch sender's wallet
  const fromWallet = await models.wallet.findOne({
    where: {
      userId: fromUserId,
      currency: currency,
      type: "ECO",
    },
  });

  if (!fromWallet) {
    throw createError({ statusCode: 404, message: "Sender wallet not found" });
  }

  // Fetch or create recipient's wallet
  let toWallet = await models.wallet.findOne({
    where: {
      userId: toUserId,
      currency: currency,
      type: "ECO",
    },
  });

  if (!toWallet) {
    toWallet = await models.wallet.create({
      userId: toUserId,
      currency: currency,
      type: "ECO",
      status: true,
    });
  }

  const parsedAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (fromWallet.balance < parsedAmount) {
    throw createError(400, "Insufficient balance.");
  }

  // Retrieve transfer fee percentage from settings

  const cacheManager = CacheManager.getInstance();
  const settings = await cacheManager.getSettings();
  const walletTransferFeePercentage =
    settings.get("walletTransferFeePercentage") || 0;

  // Calculate the transfer fee
  const transferFeeAmount = (parsedAmount * walletTransferFeePercentage) / 100;

  // Net amount that the recipient will receive after fee deduction
  const targetReceiveAmount = parsedAmount - transferFeeAmount;

  const transaction = await sequelize.transaction(async (t) => {
    // Handle private ledger updates if necessary
    let precision = 8;
    if (fromWallet.type === "ECO" && toWallet.type === "ECO") {
      // Handle private ledger updates only for ECO to ECO transfers
      const deductionDetails = await deductFromEcoWallet(
        fromWallet,
        parsedAmount,
        currency,
        t
      );

      await addToEcoWallet(toWallet, deductionDetails, currency, t);

      const currencyData = await getCurrencyData(
        fromWallet.type,
        fromWallet.currency
      );
      precision = currencyData.precision;
    }

    await updateWalletBalances(
      fromWallet,
      toWallet,
      parsedAmount,
      targetReceiveAmount,
      precision,
      t
    );

    // Create transaction records for both sender and recipient
    const outgoingTransfer = await createTransferTransaction(
      fromUserId,
      fromWallet.id,
      "OUTGOING_TRANSFER",
      parsedAmount,
      transferFeeAmount, // Record the fee in the outgoing transaction
      currency,
      currency,
      fromWallet.id,
      toWallet.id,
      `Internal transfer to user ${toUserId}`,
      "COMPLETED",
      t
    );

    const incomingTransfer = await createTransferTransaction(
      toUserId,
      toWallet.id,
      "INCOMING_TRANSFER",
      targetReceiveAmount, // Amount received after fee deduction
      0, // No fee for incoming transfer
      currency,
      currency,
      fromWallet.id,
      toWallet.id,
      `Internal transfer from user ${fromUserId}`,
      "COMPLETED",
      t
    );

    // Record admin profit only if a fee was charged
    if (transferFeeAmount > 0) {
      await recordAdminProfit({
        userId: fromUserId,
        transferFeeAmount,
        fromCurrency: currency,
        fromType: "ECO",
        toType: "ECO",
        transactionId: outgoingTransfer.id,
        t,
      });
    }

    // Return the original structure expected by your function
    return { outgoingTransfer, incomingTransfer };
  });

  // Return the same structure as the original implementation
  const userWallet = await models.wallet.findOne({
    where: { userId: fromUserId, currency, type: "ECO" },
  });

  return {
    transaction,
    balance: userWallet?.balance,
    method: chain,
    currency,
  };
}
