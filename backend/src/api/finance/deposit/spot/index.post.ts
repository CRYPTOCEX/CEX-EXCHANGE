// /server/api/wallets/fiat/customDeposit.post.ts
import ExchangeManager from "@b/utils/exchange";
import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { handleNetworkMappingReverse } from "../../currency/[type]/[code]/[method]/index.get";

export const metadata: OperationObject = {
  summary: "Initiates a spot deposit transaction",
  description:
    "This endpoint initiates a spot deposit transaction for the user",
  operationId: "initiateSpotDeposit",
  tags: ["Finance", "Deposit"],
  requiresAuth: true,
  logModule: "SPOT_DEPOSIT",
  logTitle: "Initiate spot deposit",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            currency: { type: "string" },
            chain: { type: "string" },
            trx: { type: "string" },
          },
          required: ["currency", "chain", "trx"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Spot deposit transaction initiated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Deposit Method"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;

  if (!user?.id) {
    ctx?.fail("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { currency, chain, trx } = body;

  ctx?.step("Processing network configuration");
  const provider = await ExchangeManager.getProvider();
  const parsedChain =
    provider === "xt" ? handleNetworkMappingReverse(chain) : chain;

  ctx?.step("Fetching user account");
  const userPk = await models.user.findByPk(user.id);
  if (!userPk) {
    ctx?.fail("User not found");
    throw createError({ statusCode: 404, message: "User not found" });
  }

  ctx?.step("Checking for duplicate transaction");
  const existingTransaction = await models.transaction.findOne({
    where: { referenceId: trx, type: "DEPOSIT" },
  });

  if (existingTransaction) {
    ctx?.warn("Transaction already exists");
    throw createError({
      statusCode: 400,
      message: "Transaction already exists",
    });
  }

  ctx?.step("Finding or creating SPOT wallet");
  let wallet = await models.wallet.findOne({
    where: { userId: user.id, currency: currency, type: "SPOT" },
  });

  if (!wallet) {
    wallet = await models.wallet.create({
      userId: user.id,
      currency: currency,
      type: "SPOT",
      status: true,
    });
  }

  ctx?.step("Validating currency");
  const currencyData = await models.exchangeCurrency.findOne({
    where: { currency },
  });
  if (!currencyData) {
    ctx?.fail("Currency not found");
    throw createError({
      statusCode: 404,
      message: "Currency not found",
    });
  }

  ctx?.step("Creating deposit transaction record");
  const transaction = await models.transaction.create({
    userId: user.id,
    walletId: wallet.id,
    type: "DEPOSIT",
    amount: 0,
    status: "PENDING",
    description: `${currency} deposit transaction initiated`,
    metadata: JSON.stringify({ currency, chain: parsedChain, trx }),
    referenceId: trx,
  });

  ctx?.success(`Spot deposit initiated: ${currency} on ${parsedChain}`);

  return {
    transaction,
    currency: wallet.currency,
    chain: parsedChain,
    trx: trx,
    method: "SPOT",
  };
};
