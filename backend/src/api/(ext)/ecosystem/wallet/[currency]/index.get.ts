import { createError } from "@b/utils/error";
import {
  baseWalletSchema,
  isAddressLocked,
  lockAddress,
  unlockExpiredAddresses,
} from "../utils";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { getWalletByUserIdAndCurrency } from "@b/api/(ext)/ecosystem/utils/wallet";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Fetches a specific wallet by currency",
  description:
    "Retrieves details of a wallet associated with the logged-in user by its currency.",
  operationId: "getWallet",
  tags: ["Wallet", "User"],
  requiresAuth: true,
  logModule: "ECOSYSTEM",
  logTitle: "Get wallet by currency",
  parameters: [
    {
      index: 0,
      name: "currency",
      in: "path",
      required: true,
      schema: { type: "string", description: "Currency of the wallet" },
    },
    {
      name: "contractType",
      in: "query",
      schema: { type: "string", description: "Chain of the wallet address" },
    },
    {
      name: "chain",
      in: "query",
      schema: { type: "string", description: "Chain of the wallet address" },
    },
  ],
  responses: {
    200: {
      description: "Wallet retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseWalletSchema,
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
  const { params, user, query, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { currency } = params;
  const { contractType, chain } = query;

  let wallet;
  try {
    ctx?.step(`Fetching wallet for ${currency}`);
    wallet = await getWalletByUserIdAndCurrency(user.id, currency);
  } catch (error) {
    console.error(`[WALLET_ERROR] Failed to get/create wallet for user ${user.id}, currency ${currency}:`, error);
    console.error(`[WALLET_ERROR] Error details:`, {
      message: error.message,
      stack: error.stack,
      original: error.original?.message,
      sql: error.sql
    });

    ctx?.fail(`Failed to get wallet: ${error.message}`);
    throw createError({
      statusCode: 500,
      message: `Failed to get wallet: ${error.message}`,
    });
  }

  if (contractType === "NO_PERMIT") {
    ctx?.step("Processing NO_PERMIT wallet request");
    await unlockExpiredAddresses(ctx);

    try {
      const wallets = await getActiveCustodialWallets(chain, ctx);
      const availableWallets: ecosystemCustodialWalletAttributes[] = [];

      ctx?.step("Checking wallet availability");
      for (const wallet of wallets) {
        if (!(await isAddressLocked(wallet.address, ctx))) {
          availableWallets.push(wallet);
        }
      }

      if (availableWallets.length === 0) {
        ctx?.fail("No available custodial wallets");
        throw createError({
          statusCode: 404,
          message:
            "All custodial wallets are currently in use. Please try again later.",
        });
      }

      const randomIndex = Math.floor(Math.random() * availableWallets.length);
      const selectedWallet = availableWallets[randomIndex];
      lockAddress(selectedWallet.address, ctx);

      ctx?.success(`Assigned custodial wallet ${selectedWallet.address.substring(0, 10)}... for ${chain}`);
      return selectedWallet;
    } catch (error) {
      // If it's already a createError with statusCode, preserve it
      if (error.statusCode) {
        ctx?.fail(error.message);
        throw error;
      }

      // Otherwise, wrap it as a 500 error
      ctx?.fail(error.message);
      throw createError({
        statusCode: 500,
        message: error.message,
      });
    }
  }

  ctx?.success(`Retrieved wallet for ${currency}`);
  return wallet;
};

export async function getActiveCustodialWallets(
  chain,
  ctx?: any
): Promise<ecosystemCustodialWalletAttributes[]> {
  ctx?.step?.(`Fetching active custodial wallets for ${chain}`);
  const wallets = await models.ecosystemCustodialWallet.findAll({
    where: {
      chain: chain,
      status: "ACTIVE",
    },
    attributes: ["id", "address", "chain", "network"],
  });
  ctx?.success?.(`Found ${wallets.length} active custodial wallet(s) for ${chain}`);
  return wallets;
}
