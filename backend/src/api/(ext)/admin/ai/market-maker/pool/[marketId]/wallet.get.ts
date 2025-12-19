import { models } from "@b/db";
import {
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";
import { createError } from "@b/utils/error";
import { getWalletByUserIdAndCurrency } from "@b/api/(ext)/ecosystem/utils/wallet";

export const metadata: OperationObject = {
  summary: "Get admin wallet balances for Market Maker pool",
  operationId: "getMarketMakerPoolWallet",
  tags: ["Admin", "AI Market Maker", "Pool"],
  description:
    "Retrieves the admin\'s wallet balances for both base and quote currencies associated with an AI Market Maker. This information is useful for checking available funds before making deposits to the pool.",
  parameters: [
    {
      index: 0,
      name: "marketId",
      in: "path",
      required: true,
      description: "ID of the AI Market Maker",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Admin wallet balances retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              base: {
                type: "object",
                description: "Base currency wallet information",
                properties: {
                  currency: {
                    type: "string",
                    description: "Base currency symbol",
                  },
                  balance: {
                    type: "number",
                    description: "Available balance in base currency",
                  },
                  walletId: {
                    type: "string",
                    nullable: true,
                    description: "Wallet ID (null if wallet doesn't exist)",
                  },
                },
              },
              quote: {
                type: "object",
                description: "Quote currency wallet information",
                properties: {
                  currency: {
                    type: "string",
                    description: "Quote currency symbol",
                  },
                  balance: {
                    type: "number",
                    description: "Available balance in quote currency",
                  },
                  walletId: {
                    type: "string",
                    nullable: true,
                    description: "Wallet ID (null if wallet doesn't exist)",
                  },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("AI Market Maker"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  logModule: "ADMIN_AI",
  logTitle: "Get Market Maker Pool Wallet",
  permission: "view.ai.market-maker.pool",
};

export default async (data: Handler) => {
  const { params, user, ctx } = data;

  if (!user?.id) {
    throw createError(401, "Unauthorized");
  }

  // Get market maker with market info
  ctx?.step("Get Market Maker Pool Wallet");

  const marketMaker = await models.aiMarketMaker.findByPk(params.marketId, {
    include: [
      {
        model: models.ecosystemMarket,
        as: "market",
      },
    ],
  });

  if (!marketMaker) {
    throw createError(404, "AI Market Maker not found");
  }

  const market = marketMaker.market as any;
  if (!market) {
    throw createError(404, "Ecosystem market not found");
  }

  const baseCurrency = market.currency;
  const quoteCurrency = market.pair;

  // Get admin's wallets for both currencies
  let baseWallet: any = null;
  let quoteWallet: any = null;

  try {
    baseWallet = await getWalletByUserIdAndCurrency(user.id, baseCurrency);
  } catch {
    // Wallet might not exist yet
  }

  try {
    quoteWallet = await getWalletByUserIdAndCurrency(user.id, quoteCurrency);
  } catch {
    // Wallet might not exist yet
  }

  ctx?.success("Get Market Maker Pool Wallet retrieved successfully");
  return {
    base: {
      currency: baseCurrency,
      balance: baseWallet ? Number(baseWallet.balance || 0) : 0,
      walletId: baseWallet?.id || null,
    },
    quote: {
      currency: quoteCurrency,
      balance: quoteWallet ? Number(quoteWallet.balance || 0) : 0,
      walletId: quoteWallet?.id || null,
    },
  };
};
