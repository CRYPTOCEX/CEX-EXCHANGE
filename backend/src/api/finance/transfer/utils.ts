import { models } from "@b/db";
import {
  sendIncomingTransferEmail,
  sendOutgoingTransferEmail,
} from "@b/utils/emails";
import { createError } from "@b/utils/error";

export async function updatePrivateLedger(
  walletId: string,
  index: number,
  currency: string,
  chain: string,
  amount: number,
  transaction?: any // Optional transaction parameter
): Promise<void> {
  const networkEnvVar = `${chain.toUpperCase()}_NETWORK`;
  const network = process.env[networkEnvVar];

  if (!network) {
    throw createError(
      400,
      `Network environment variable for ${chain} is not set`
    );
  }

  const existingLedger = await models.ecosystemPrivateLedger.findOne({
    where: {
      walletId,
      index,
      currency,
      chain,
      network,
    },
    ...(transaction && { transaction }), // Include transaction if provided
  });

  if (existingLedger) {
    await models.ecosystemPrivateLedger.update(
      {
        offchainDifference: existingLedger.offchainDifference + amount,
      },
      {
        where: {
          walletId,
          index,
          currency,
          chain,
          network,
        },
        ...(transaction && { transaction }), // Include transaction if provided
      }
    );
  } else {
    await models.ecosystemPrivateLedger.create(
      {
        walletId,
        index,
        currency,
        chain,
        offchainDifference: amount,
        network,
      },
      transaction ? { transaction } : undefined
    ); // Include transaction if provided
  }
}

export async function getCurrencyData(fromType: string, currency: string) {
  switch (fromType) {
    case "FIAT":
      return await models.currency.findOne({ where: { id: currency } });
    case "SPOT":
      return await models.exchangeCurrency.findOne({ where: { currency } });
    case "ECO":
    case "FUTURES":
      return await models.ecosystemToken.findOne({ where: { currency } });
  }
}

export function calculateTransferFee(amount: number, feePercentage: number) {
  return (amount * feePercentage) / 100;
}

export function requiresPrivateLedgerUpdate(
  transferType: string,
  fromType: string,
  toType: string
) {
  return (
    (transferType === "client" && (fromType === "ECO" || toType === "ECO")) ||
    (fromType === "ECO" && toType === "FUTURES") ||
    (fromType === "FUTURES" && toType === "ECO")
  );
}

export async function updateWalletBalances(
  fromWallet,
  toWallet,
  parsedAmount,
  targetReceiveAmount,
  precision,
  t
) {
  const updatedFromBalance = calculateNewBalance(
    fromWallet.balance,
    -parsedAmount,
    precision
  );
  const updatedToBalance = calculateNewBalance(
    toWallet.balance,
    targetReceiveAmount,
    precision
  );

  await fromWallet.update({ balance: updatedFromBalance }, { transaction: t });
  await toWallet.update({ balance: updatedToBalance }, { transaction: t });
}

export function calculateNewBalance(
  current: number,
  change: number,
  precision: any
) {
  // Validate inputs to prevent NaN results
  const currentBalance = isNaN(current) ? 0 : current;
  const changeAmount = isNaN(change) ? 0 : change;
  
  // Ensure precision is a valid number
  let precisionValue = 8; // default precision
  if (typeof precision === 'number' && precision >= 0 && precision <= 18) {
    precisionValue = Math.floor(precision);
  } else if (precision && typeof precision === 'object' && typeof precision.precision === 'number') {
    precisionValue = Math.floor(precision.precision);
  }
  
  const newBalance = currentBalance + changeAmount;
  
  // Prevent negative balances (safety check)
  const finalBalance = Math.max(0, newBalance);
  
  return parseFloat(finalBalance.toFixed(precisionValue));
}

export function getSortedChainBalances(fromAddresses: any) {
  return Object.entries(fromAddresses)
    .filter(([_, chainInfo]) => (chainInfo as { balance: number }).balance > 0)
    .sort(
      (
        [, a]: [string, { balance: number }],
        [, b]: [string, { balance: number }]
      ) => b.balance - a.balance
    );
}

export async function recordAdminProfit({
  userId,
  transferFeeAmount,
  fromCurrency,
  fromType,
  toType,
  transactionId,
  t,
}: any) {
  await models.adminProfit.create(
    {
      amount: transferFeeAmount,
      currency: fromCurrency,
      type: "TRANSFER",
      transactionId,
      description: `Transfer fee for user (${userId}) of ${transferFeeAmount} ${fromCurrency} from ${fromType} to ${toType}`,
    },
    { transaction: t }
  );
}

export async function createTransferTransaction(
  userId: string,
  walletId: string,
  type: "INCOMING_TRANSFER" | "OUTGOING_TRANSFER",
  amount: number,
  fee: number, // Include the fee parameter for better clarity
  fromCurrency: string,
  toCurrency: string,
  fromWalletId: string,
  toWalletId: string,
  description: string,
  status: "PENDING" | "COMPLETED",
  transaction: any
) {
  return await models.transaction.create(
    {
      userId,
      walletId,
      type,
      amount,
      fee, // Record the fee in the transaction
      status,
      metadata: JSON.stringify({
        fromWallet: fromWalletId,
        toWallet: toWalletId,
        fromCurrency,
        toCurrency,
      }),
      description,
    },
    { transaction }
  );
}

export async function sendTransferEmails(
  user: any,
  toUser: any,
  fromWallet: any,
  toWallet: any,
  amount: number,
  transaction: any
) {
  try {
    await sendOutgoingTransferEmail(
      user,
      toUser,
      fromWallet,
      amount,
      transaction.fromTransfer.id
    );
    await sendIncomingTransferEmail(
      toUser,
      user,
      toWallet,
      amount,
      transaction.toTransfer.id
    );
  } catch (error) {
    console.log("Error sending transfer email: ", error);
  }
}
