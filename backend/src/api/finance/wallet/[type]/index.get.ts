import { models } from "@b/db";
import { add, format } from "date-fns";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { walletSchema } from "@b/api/admin/finance/wallet/utils";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Lists all wallets for a given type",
  operationId: "listWalletsForType",
  tags: ["Finance", "Wallets"],
  parameters: [
    {
      index: 0,
      name: "type",
      in: "path",
      description: "Wallet type",
      required: true,
      schema: {
        type: "string",
        enum: ["FIAT", "SPOT", "ECO", "FUTURES"],
      },
    },
  ],
  responses: {
    200: {
      description: "List of wallets",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: walletSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Wallets"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, user } = data;

  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const walletType = params.type;

  const where = { userId: user.id, type: walletType };

  const items = await models.wallet.findAll({
    where,
    paranoid: false,
  });

  // Add ecosystem token icons if wallet type is ECO.
  const ecoWallets = items.filter((wallet) => wallet.type === "ECO");
  if (ecoWallets.length > 0) {
    const ecoCurrencies = Array.from(
      new Set(ecoWallets.map((wallet) => wallet.currency))
    ) as string[];

    const ecosystemTokens = await models.ecosystemToken.findAll({
      where: { currency: ecoCurrencies },
    });

    const tokenMap = new Map(
      ecosystemTokens.map((token) => [token.currency, token.icon])
    );

    ecoWallets.forEach((wallet) => {
      wallet.icon = tokenMap.get(wallet.currency) || null;
    });
  }

  return items;
};
