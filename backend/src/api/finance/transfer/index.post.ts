import { models, sequelize } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { getEcosystemWalletUtils, isServiceAvailable } from "@b/utils/safe-imports";
import { logger } from "@b/utils/console";

// Safe import for wallet utils (only available if extension is installed)
async function getWalletByUserIdAndCurrency(userId: string | number, currency: string) {
  const walletUtils = await getEcosystemWalletUtils();

  if (!isServiceAvailable(walletUtils)) {
    throw new Error("Ecosystem wallet extension is not installed or available");
  }

  if (typeof walletUtils.getWalletByUserIdAndCurrency !== 'function') {
    throw new Error("getWalletByUserIdAndCurrency function not found");
  }

  return walletUtils.getWalletByUserIdAndCurrency(userId, currency);
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
  logModule: "TRANSFER",
  logTitle: "Process transfer transaction",
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
  const { user, body, ctx } = data;

  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  ctx?.step("Parsing transfer request parameters");
  const {
    fromType,
    toType,
    amount,
    transferType,
    clientId,
    fromCurrency,
    toCurrency,
  } = body;

  ctx?.step("Validating transfer request");
  if (toCurrency === "Select a currency") {
    ctx?.fail("Invalid target currency selected");
    throw createError({
      statusCode: 400,
      message: "Please select a target currency",
    });
  }

  // Wallet transfers must be between different wallet types
  if (transferType === "wallet" && fromType === toType) {
    ctx?.fail("Cannot transfer between same wallet type");
    throw createError({
      statusCode: 400,
      message: "Wallet transfers must be between different wallet types",
    });
  }

  ctx?.step("Verifying user exists in database");
  const userPk = await models.user.findByPk(user.id);
  if (!userPk) {
    ctx?.fail("User not found");
    throw createError({ statusCode: 404, message: "User not found" });
  }

  ctx?.step(`Fetching source wallet (${fromCurrency} ${fromType})`);
  const fromWallet = await models.wallet.findOne({
    where: {
      userId: user.id,
      currency: fromCurrency,
      type: fromType,
    },
  });
  if (!fromWallet) {
    ctx?.fail("Source wallet not found");
    throw createError({ statusCode: 404, message: "Wallet not found" });
  }

  let toWallet: any = null;
  let toUser: any = null;

  if (transferType === "client") {
    ctx?.step(`Resolving destination wallet for client transfer`);
    ({ toWallet, toUser } = await handleClientTransfer(
      clientId,
      toCurrency || fromCurrency,
      toType || fromType
    ));
  } else {
    ctx?.step(`Resolving destination wallet for wallet-to-wallet transfer`);
    toWallet = await handleWalletTransfer(
      user.id,
      fromType,
      toType,
      toCurrency
    );
  }

  ctx?.step("Validating transfer amount");
  const parsedAmount = parseFloat(amount);

  // Validate amount
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    ctx?.fail("Invalid transfer amount");
    throw createError(400, "Invalid transfer amount");
  }

  ctx?.step("Fetching currency data");
  const currencyData = await getCurrencyData(fromType, fromCurrency);
  if (!currencyData) {
    ctx?.fail("Invalid wallet type");
    throw createError(400, "Invalid wallet type");
  }

  // Calculate fee to check total deduction needed
  ctx?.step("Calculating transfer fees");
  const cacheManager = CacheManager.getInstance();
  const settings = await cacheManager.getSettings();
  const walletTransferFeePercentage = settings.get("walletTransferFeePercentage") || 0;
  const transferFeeAmount = calculateTransferFee(parsedAmount, walletTransferFeePercentage);
  const totalDeduction = parsedAmount; // Fee is deducted from the amount, not added

  // Check if wallet has sufficient balance for the transfer
  ctx?.step("Checking source wallet balance");
  if (fromWallet.balance < totalDeduction) {
    ctx?.fail(`Insufficient balance: ${fromWallet.balance} < ${totalDeduction}`);
    throw createError(400, "Insufficient balance to cover transfer");
  }

  ctx?.step("Executing transfer transaction");
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
    ctx?.step("Sending transfer notification emails");
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

  ctx?.success(`Transfer completed: ${parsedAmount} ${fromCurrency} from ${fromType} to ${toCurrency || fromCurrency} ${toType}`);

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
      logger.warn("TRANSFER", "ECO extension not available, falling back to regular wallet", error);
      
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
    logger.info("TRANSFER", `Calculating exchange rate from ${fromCurrency} to ${toCurrency}`);
    // Get exchange rate and validate both currencies have prices
    const exchangeRate = await getExchangeRate(
      fromCurrency,
      fromType,
      toCurrency,
      toType
    );

    // Convert the amount after fee deduction
    targetReceiveAmount = (parsedAmount - transferFeeAmount) * exchangeRate;
    logger.info("TRANSFER", `Converted amount: ${parsedAmount - transferFeeAmount} ${fromCurrency} = ${targetReceiveAmount} ${toCurrency} (rate: ${exchangeRate})`);
  }

  const totalDeducted = parsedAmount;

  if (fromWallet.balance < totalDeducted) {
    throw createError(400, "Insufficient balance to cover transfer and fees.");
  }

  return await sequelize.transaction(async (t) => {
    logger.info("TRANSFER", "Starting database transaction");

    const requiresLedgerUpdate = requiresPrivateLedgerUpdate(
      transferType,
      fromType,
      toType
    );

    const transferStatus = requiresLedgerUpdate ? "PENDING" : "COMPLETED";
    logger.info("TRANSFER", `Transfer status: ${transferStatus} (ledger update required: ${requiresLedgerUpdate})`);

    if (!requiresLedgerUpdate) {
      logger.info("TRANSFER", "Processing complete transfer (no ledger update required)");
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
      logger.info("TRANSFER", "Processing pending transfer (ledger update required)");
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

    logger.info("TRANSFER", "Creating outgoing transfer transaction record");
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

    logger.info("TRANSFER", "Creating incoming transfer transaction record");
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
      logger.info("TRANSFER", `Recording admin profit: ${transferFeeAmount} ${fromCurrency}`);
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

    logger.info("TRANSFER", "Database transaction completed successfully");
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
    logger.info("TRANSFER", "Handling ECO client balance transfer");
    await handleEcoClientBalanceTransfer({
      fromWallet,
      toWallet,
      parsedAmount,
      fromCurrency,
      currencyData,
      t,
    });
  } else {
    logger.info("TRANSFER", "Handling non-client transfer");
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
  logger.info("TRANSFER", "Parsing ECO wallet addresses");
  const fromAddresses = parseAddresses(fromWallet.address);
  const toAddresses = parseAddresses(toWallet.address);

  logger.info("TRANSFER", `Distributing ${parsedAmount} ${fromCurrency} across chains`);
  let remainingAmount = parsedAmount;
  for (const [chain, chainInfo] of getSortedChainBalances(fromAddresses)) {
    if (remainingAmount <= 0) break;

    const transferableAmount = Math.min(
      (chainInfo as { balance: number }).balance,
      remainingAmount
    );

    logger.info("TRANSFER", `Transferring ${transferableAmount} from chain: ${chain}`);

    (chainInfo as { balance: number }).balance -= transferableAmount;
    toAddresses[chain] = toAddresses[chain] || { balance: 0 };
    toAddresses[chain].balance += transferableAmount;

    logger.info("TRANSFER", `Updating private ledger for sender wallet on chain: ${chain}`);
    await updatePrivateLedger(
      fromWallet.id,
      0,
      fromCurrency,
      chain,
      -transferableAmount,
      t
    );
    logger.info("TRANSFER", `Updating private ledger for recipient wallet on chain: ${chain}`);
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
    logger.error("TRANSFER", `Insufficient chain balance: ${remainingAmount} ${fromCurrency} remaining`);
    throw createError(400, "Insufficient chain balance across all addresses.");
  }

  logger.info("TRANSFER", "Updating wallet balances");
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
    logger.info("TRANSFER", "Processing ECO to ECO wallet transfer");
    logger.info("TRANSFER", "Deducting from source ECO wallet");
    const deductionDetails = await deductFromEcoWallet(
      fromWallet,
      parsedAmount,
      fromCurrency,
      t
    );

    logger.info("TRANSFER", "Adding to destination ECO wallet");
    await addToEcoWallet(toWallet, deductionDetails, fromCurrency, t);
  }

  logger.info("TRANSFER", `Updating wallet balances (deduct: ${parsedAmount}, add: ${targetReceiveAmount})`);
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
  logger.info("TRANSFER", `Deducting ${amount} ${currency} from ECO wallet`);
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

      logger.info("TRANSFER", `Deducting ${transferableAmount} ${currency} from chain: ${chain}`);

      // Deduct the transferable amount from the sender's address balance
      addresses[chain].balance -= transferableAmount;

      // Record the deduction details
      deductionDetails.push({ chain, amount: transferableAmount });

      // Update the private ledger for the wallet
      logger.info("TRANSFER", `Updating private ledger for deduction on chain: ${chain}`);
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

  if (remainingAmount > 0) {
    logger.error("TRANSFER", `Insufficient chain balance: ${remainingAmount} ${currency} remaining`);
    throw createError(
      400,
      "Insufficient chain balance to complete the transfer"
    );
  }

  logger.info("TRANSFER", "Updating wallet address data");
  // Update the wallet with the new addresses and balance
  await wallet.update(
    {
      address: JSON.stringify(addresses),
    },
    { transaction: t }
  );

  logger.info("TRANSFER", `Successfully deducted from ${deductionDetails.length} chain(s)`);
  // Return the deduction details for use in the addition function
  return deductionDetails;
}

async function addToEcoWallet(
  wallet: any,
  deductionDetails: any[],
  currency: string,
  t: any
) {
  logger.info("TRANSFER", `Adding to ECO wallet across ${deductionDetails.length} chain(s)`);
  const addresses = parseAddresses(wallet.address);

  for (const detail of deductionDetails) {
    const { chain, amount } = detail;

    logger.info("TRANSFER", `Adding ${amount} ${currency} to chain: ${chain}`);

    // Initialize chain if it doesn't exist
    if (!addresses[chain]) {
      logger.info("TRANSFER", `Initializing new chain entry: ${chain}`);
      addresses[chain] = {
        address: null, // Set to null or assign a valid address if available
        network: null, // Set to null or assign the appropriate network
        balance: 0,
      };
    }

    // Update the recipient's balance for that chain
    addresses[chain].balance += amount;

    // Update the private ledger for the wallet
    logger.info("TRANSFER", `Updating private ledger for addition on chain: ${chain}`);
    await updatePrivateLedger(wallet.id, 0, currency, chain, amount);
  }

  logger.info("TRANSFER", "Updating wallet address data");
  // Update the wallet with the new addresses and balance
  await wallet.update(
    {
      address: JSON.stringify(addresses),
    },
    { transaction: t }
  );
  logger.info("TRANSFER", "Successfully added to ECO wallet");
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
  logger.info("TRANSFER", `Calculating new source wallet balance (current: ${fromWallet.balance}, deducting: ${totalDeducted})`);
  const newFromBalance = calculateNewBalance(
    fromWallet.balance,
    -totalDeducted,
    currencyData
  );
  logger.info("TRANSFER", `Updating source wallet balance to: ${newFromBalance}`);
  await fromWallet.update({ balance: newFromBalance }, { transaction: t });

  if (transferStatus === "COMPLETED") {
    logger.info("TRANSFER", `Calculating new destination wallet balance (current: ${toWallet.balance}, adding: ${targetReceiveAmount})`);
    const newToBalance = calculateNewBalance(
      toWallet.balance,
      targetReceiveAmount,
      currencyData
    );
    logger.info("TRANSFER", `Updating destination wallet balance to: ${newToBalance}`);
    await toWallet.update({ balance: newToBalance }, { transaction: t });
  } else {
    logger.info("TRANSFER", "Transfer is pending, destination wallet balance not updated yet");
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
      logger.error("TRANSFER", "Failed to parse address JSON", error);
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
