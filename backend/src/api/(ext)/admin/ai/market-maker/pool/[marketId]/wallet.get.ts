import { models } from "@b/db";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { getWalletByUserIdAndCurrency } from "@b/api/(ext)/ecosystem/utils/wallet";

export const metadata: OperationObject = {
  summary: "Get admin wallet balances for AI Market Maker",
  operationId: "getAiMarketMakerWalletBalances",
  tags: ["Admin", "AI Market Maker", "Pool"],
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
      description: "Admin wallet balances",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              base: {
                type: "object",
                properties: {
                  currency: { type: "string" },
                  balance: { type: "number" },
                  walletId: { type: "string" },
                },
              },
              quote: {
                type: "object",
                properties: {
                  currency: { type: "string" },
                  balance: { type: "number" },
                  walletId: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Market Maker"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ai.market-maker.pool",
};

export default async (data: Handler) => {
  const { params, user } = data;

  if (!user?.id) {
    throw createError(401, "Unauthorized");
  }

  // Get market maker with market info
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
