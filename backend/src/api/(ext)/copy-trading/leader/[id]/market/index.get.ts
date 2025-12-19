import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Get leader's declared markets (public)",
  description: "Returns all active markets a leader has declared for trading. Used by followers to see which markets they can allocate to.",
  operationId: "getLeaderMarketsPublic",
  tags: ["Copy Trading", "Leader"],
  logModule: "COPY",
  logTitle: "Get leader markets public",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Leader ID",
    },
  ],
  responses: {
    200: {
      description: "Markets retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                symbol: { type: "string" },
                baseCurrency: { type: "string" },
                quoteCurrency: { type: "string" },
                minBase: { type: "number", description: "Minimum base currency allocation" },
                minQuote: { type: "number", description: "Minimum quote currency allocation" },
              },
            },
          },
        },
      },
    },
    404: { description: "Leader not found" },
  },
};

export default async (data: Handler) => {
  const { params, ctx } = data;

  ctx?.step("Validating leader exists");
  const leader = await models.copyTradingLeader.findOne({
    where: { id: params.id, status: "ACTIVE", isPublic: true },
  });

  if (!leader) {
    throw createError({ statusCode: 404, message: "Leader not found" });
  }

  ctx?.step("Fetching leader markets");
  const markets = await models.copyTradingLeaderMarket.findAll({
    where: { leaderId: params.id, isActive: true },
    attributes: ["id", "symbol", "baseCurrency", "quoteCurrency", "minBase", "minQuote"],
    order: [["createdAt", "ASC"]],
  });

  ctx?.success(`Retrieved ${markets.length} markets`);
  return markets;
};
