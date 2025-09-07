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
  const { params, user, query } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { currency } = params;
  const { contractType, chain } = query;

  const wallet = await getWalletByUserIdAndCurrency(user.id, currency);

  if (contractType === "NO_PERMIT") {
    await unlockExpiredAddresses();

    try {
      const wallets = await getActiveCustodialWallets(chain);
      const availableWallets: ecosystemCustodialWalletAttributes[] = [];

      for (const wallet of wallets) {
        if (!(await isAddressLocked(wallet.address))) {
          availableWallets.push(wallet);
        }
      }

      if (availableWallets.length === 0) {
        throw createError({
          statusCode: 404,
          message:
            "All custodial wallets are currently in use. Please try again later.",
        });
      }

      const randomIndex = Math.floor(Math.random() * availableWallets.length);
      const selectedWallet = availableWallets[randomIndex];
      lockAddress(selectedWallet.address);
      return selectedWallet;
    } catch (error) {
      // If it's already a createError with statusCode, preserve it
      if (error.statusCode) {
        throw error;
      }

      // Otherwise, wrap it as a 500 error
      throw createError({
        statusCode: 500,
        message: error.message,
      });
    }
  }

  return wallet;
};

export async function getActiveCustodialWallets(
  chain
): Promise<ecosystemCustodialWalletAttributes[]> {
  return await models.ecosystemCustodialWallet.findAll({
    where: {
      chain: chain,
      status: "ACTIVE",
    },
    attributes: ["id", "address", "chain", "network"],
  });
}
