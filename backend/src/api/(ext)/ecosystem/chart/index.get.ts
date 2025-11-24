import { baseHistoricalDataSchema } from "../order/utils";
import { getHistoricalCandles } from "@b/api/(ext)/ecosystem/utils/scylla/queries";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Retrieves historical data for a specific symbol",
  description:
    "Fetches historical price data based on the specified interval and date range.",
  operationId: "getHistoricalData",
  tags: ["Market", "Historical"],
  parameters: [
    {
      name: "symbol",
      in: "query",
      required: true,
      schema: { type: "string", description: "Trading symbol, e.g., BTC/USD" },
    },
    {
      name: "from",
      in: "query",
      required: true,
      schema: {
        type: "number",
        description: "Start timestamp for historical data",
      },
    },
    {
      name: "to",
      in: "query",
      required: true,
      schema: {
        type: "number",
        description: "End timestamp for historical data",
      },
    },
    {
      name: "interval",
      in: "query",
      required: true,
      schema: {
        type: "string",
        description: "Time interval for the data, e.g., 1m, 5m, 1h",
      },
    },
  ],
  responses: {
    200: {
      description: "Historical data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseHistoricalDataSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Chart"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { query } = data;

  const { symbol, from, to, interval } = query;
  if (!from || !to || !interval) {
    throw new Error("Both `from`, `to`, and `interval` must be provided.");
  }

  const bars = await getHistoricalCandles(
    symbol,
    interval,
    Number(from),
    Number(to)
  );
  return bars;
};
