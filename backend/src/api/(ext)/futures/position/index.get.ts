import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { getPositions } from "@b/api/(ext)/futures/utils/queries/positions";

// Safe import for ecosystem modules
let fromBigInt: any;
try {
  const module = require("@b/api/(ext)/ecosystem/utils/blockchain");
  fromBigInt = module.fromBigInt;
} catch (e) {
  // Ecosystem extension not available
}

export const metadata: OperationObject = {
  summary: "List Futures Positions",
  operationId: "listFuturesPositions",
  tags: ["Futures", "Positions"],
  description:
    "Retrieves a list of futures positions for the authenticated user.",
  parameters: [
    {
      name: "currency",
      in: "query",
      description: "Currency of the positions to retrieve.",
      schema: { type: "string" },
    },
    {
      name: "pair",
      in: "query",
      description: "Pair of the positions to retrieve.",
      schema: { type: "string" },
    },
    {
      name: "type",
      in: "query",
      description: "Type of positions to retrieve.",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "A list of futures positions",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                userId: { type: "string" },
                symbol: { type: "string" },
                side: { type: "string" },
                entryPrice: { type: "string" },
                amount: { type: "string" },
                leverage: { type: "string" },
                unrealizedPnl: { type: "string" },
                status: { type: "string" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Position"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const { currency, pair, type } = data.query;

  try {
    const symbol = currency && pair ? `${currency}/${pair}` : undefined;
    const status = type === "OPEN_POSITIONS" ? "OPEN" : undefined;
    const positions = await getPositions(user.id, symbol, status);

    if (!positions || positions.length === 0) {
      return [];
    }

    const result = positions.map((position) => ({
      ...position,
      entryPrice: fromBigInt ? fromBigInt(position.entryPrice) : position.entryPrice,
      amount: fromBigInt ? fromBigInt(position.amount) : position.amount,
      leverage: position.leverage,
      unrealizedPnl: fromBigInt ? fromBigInt(position.unrealizedPnl) : position.unrealizedPnl,
      createdAt: position.createdAt.toISOString(),
      updatedAt: position.updatedAt.toISOString(),
    }));

    if (type === "POSITIONS_HISTORY") {
      return result.filter((position) => position.status !== "OPEN");
    }

    return result;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to retrieve positions: ${error.message}`,
    });
  }
};
