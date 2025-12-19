import { Op } from "sequelize";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Get available master wallets for custodial wallet creation",
  description: "Retrieves a list of master wallets that support custodial wallet creation. Excludes chains that do not support smart contract deployment (SOL, TRON, BTC, LTC, DOGE, DASH, XMR, TON, MO).",
  operationId: "getEcosystemCustodialWalletOptions",
  tags: ["Admin", "Ecosystem", "Wallet"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Ecosystem custodial wallet options retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                value: { type: "string" },
                label: { type: "string" },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("EcosystemMasterWallet"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, ctx } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  ctx?.step("Fetching custodial wallet options");

  try {
    const masterWallets = await models.ecosystemMasterWallet.findAll({
      where: {
        chain: {
          [Op.notIn]: [
            "SOL",
            "TRON",
            "BTC",
            "LTC",
            "DOGE",
            "DASH",
            "XMR",
            "TON",
            "MO",
          ],
        },
      },
    });

    // Format the retrieved wallets into an array of options.
    const options = masterWallets.map((wallet) => ({
      value: wallet.id,
      label: `${wallet.chain} - ${wallet.address.substring(0, 10)}...`,
    }));

    ctx?.success(`Retrieved ${options.length} custodial wallet options`);

    return options;
  } catch (error) {
    throw createError(
      500,
      "An error occurred while fetching ecosystem custodial wallet options"
    );
  }
};
