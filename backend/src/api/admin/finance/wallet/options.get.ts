// /api/admin/wallets/structure.get.ts
import { models } from "@b/db";
import { CacheManager } from "@b/utils/cache";

export const metadata = {
  summary: "Get wallet types",
  operationId: "getWalletTypes",
  tags: ["Admin", "Wallets"],
  responses: {
    200: {
      description: "Wallet types",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              types: {
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
      },
    },
  },
};

export default async () => {
  const type = [{ id: "FIAT", name: "Fiat" }];

  const exchangeEnabled = await models.exchange.findOne({
    where: { status: true },
  });

  if (exchangeEnabled) {
    type.push({ id: "SPOT", name: "Spot" });
  }

  const cacheManager = CacheManager.getInstance();
  const extensions = await cacheManager.getExtensions();
  if (extensions.has("ecosystem")) {
    type.push({ id: "ECO", name: "Funding" });
  }

  return type;
};
