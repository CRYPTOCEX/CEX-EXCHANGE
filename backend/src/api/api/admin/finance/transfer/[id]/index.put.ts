// /api/admin/transactions/[id]/update.put.ts
import { updateRecordResponses } from "@b/utils/query";
import { models, sequelize } from "@b/db";
import { transactionUpdateSchema } from "@b/api/finance/transaction/utils";
import ExchangeManager from "@b/utils/exchange";
import { RedisSingleton } from "@b/utils/redis";
// Safe import for Scylla queries (only available if extension is installed)
async function getLastCandles() {
  try {
    // @ts-ignore - Dynamic import for optional extension
    const module = await import("@b/api/(ext)/ecosystem/utils/scylla/queries");
    return module.getLastCandles();
  } catch (error) {
    // Return empty array if extension not available
    return [];
  }
}

export const metadata = {
  summary: "Updates an existing transaction",
  operationId: "updateTransaction",
  tags: ["Admin", "Wallets", "Transactions"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "The ID of the transaction to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated data for the transaction",
    content: {
      "application/json": {
        schema: transactionUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Transaction"),
  requiresAuth: true,
  permission: "edit.transfer",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const {
    status,
    amount,
    fee,
    description,
    referenceId,
    metadata: requestMetadata,
  } = body;

  const transaction = await models.transaction.findOne({
    where: { id },
  });

  if (!transaction) throw new Error("Transaction not found");

  if (transaction.status !== "PENDING") {
    throw new Error("Only pending transactions can be updated");
  }
  transaction.amount = amount;
  transaction.fee = fee;
  transaction.description = description;
  transaction.referenceId = referenceId;

  return await sequelize.transaction(async (t) => {
    const metadata: any = parseMetadata(transaction.metadata);

    const wallet = await models.wallet.findOne({
      where: { id: transaction.walletId },
      transaction: t,
    });
    if (!wallet) throw new Error("Wallet not found");

    let price = 1; // Default price for USDT
    const fromCurrency = metadata.fromCurrency;
    if (!fromCurrency) throw new Error("From currency not found");

    // const toCurrency = metadata.toCurrency;
    const descriptionParts = transaction.description.split(" ");
    const fromType = descriptionParts[2]; // "SPOT", "ECO", "FIAT"

    if (fromType === "FIAT") {
      const currency = await models.currency.findOne({
        where: { id: fromCurrency },
        transaction: t,
      });
      if (!currency) throw new Error("Currency not found");
      if (currency.price === null || typeof currency.price === "undefined")
        throw new Error("Currency price not found");

      price = currency.price;
    } else if (fromType === "SPOT") {
      if (fromCurrency !== "USDT") {
        const redis = RedisSingleton.getInstance();
        const cachedData = await redis.get("exchange:tickers");
        const tickers = cachedData ? JSON.parse(cachedData) : {};

        if (!tickers[fromCurrency]) {
          const exchange = await ExchangeManager.startExchange();
          const ticker = await exchange.fetchTicker(`${fromCurrency}/USDT`);
          if (!ticker || !ticker.last) {
            throw new Error("Unable to fetch current market price");
          }
          price = ticker.last;
        } else {
          price = tickers[fromCurrency].last;
        }
      }
    } else if (fromType === "ECO") {
      const candles = await getLastCandles();
      const candle = candles.find((c) => c.symbol === fromCurrency);
      if (!candle)
        throw new Error("Unable to fetch candle data for the currency");
      price = candle.close;
    }

    const amountToAdd = Number(transaction.amount) * price;

    let walletBalance = Number(wallet.balance);
    walletBalance += amountToAdd;
    await models.wallet.update(
      { balance: walletBalance },
      { where: { id: wallet.id }, transaction: t }
    );

    if (requestMetadata) {
      metadata.message = requestMetadata.message;
    }

    transaction.metadata = JSON.stringify(metadata);

    transaction.status = status;
    await transaction.save({ transaction: t });

    return { message: "Transaction updated successfully" };
  });
};

function parseMetadata(metadataString) {
  let metadata: any = {};

  try {
    metadataString = metadataString.replace(/\\/g, "");
    metadata = JSON.parse(metadataString) || {};
  } catch (e) {
    console.error("Invalid JSON in metadata:", metadataString);
  }
  return metadata;
}
