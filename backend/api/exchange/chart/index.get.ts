import ExchangeManager from "@b/utils/exchange";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import {
  baseChartDataPointSchema,
  findGapsInCachedData,
  getCachedOHLCV,
  intervalToMilliseconds,
  saveOHLCVToCache,
} from "./utils";
import { handleBanStatus, loadBanStatus } from "../utils";

export const metadata: OperationObject = {
  summary: "Get Historical Chart Data",
  operationId: "getHistoricalChartData",
  tags: ["Chart", "Historical"],
  description: "Retrieves historical chart data for the authenticated user.",
  parameters: [
    {
      name: "symbol",
      in: "query",
      description: "Symbol to retrieve data for.",
      required: true,
      schema: { type: "string" },
    },
    {
      name: "interval",
      in: "query",
      description: "Interval to retrieve data for.",
      required: true,
      schema: { type: "string" },
    },
    {
      name: "from",
      in: "query",
      description: "Start timestamp to retrieve data from.",
      required: true,
      schema: { type: "number" },
    },
    {
      name: "to",
      in: "query",
      description: "End timestamp to retrieve data from.",
      required: true,
      schema: { type: "number" },
    },
    {
      name: "duration",
      in: "query",
      description: "Duration to retrieve data for.",
      required: true,
      schema: { type: "number" },
    },
  ],
  responses: {
    200: {
      description: "Historical chart data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseChartDataPointSchema,
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
  return getHistoricalOHLCV(
    query.symbol,
    query.interval,
    Number(query.from),
    Number(query.to),
    Number(query.duration)
  );
};

export async function getHistoricalOHLCV(
  symbol: string,
  interval: string,
  from: number,
  to: number,
  duration: number,
  maxRetries = 3,
  retryDelay = 1000
) {
  // Check for ban status
  const unblockTime = await loadBanStatus();
  if (await handleBanStatus(unblockTime)) {
    return await getCachedOHLCV(symbol, interval, from, to);
  }

  const exchange = await (ExchangeManager as any).startExchange();
  if (!exchange) {
    return [];
  }

  const cachedData = await getCachedOHLCV(symbol, interval, from, to);
  const expectedBars = Math.ceil(
    (to - from) / intervalToMilliseconds(interval)
  );

  if (cachedData.length === expectedBars) {
    return cachedData;
  }

  const missingIntervals = findGapsInCachedData(cachedData, from, to, interval);
  const currentTimestamp = Date.now();
  const intervalMs = intervalToMilliseconds(interval);

  for (const { gapStart, gapEnd } of missingIntervals) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (await handleBanStatus(await loadBanStatus())) {
          return cachedData;
        }

        // Adjust gapEnd to skip the current ongoing bar
        const adjustedGapEnd =
          gapEnd > currentTimestamp - intervalMs
            ? currentTimestamp - intervalMs
            : gapEnd;

        const data = await exchange.fetchOHLCV(
          symbol,
          interval,
          gapStart,
          500,
          { until: adjustedGapEnd }
        );

        await saveOHLCVToCache(symbol, interval, data);
        break;
      } catch (e) {
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          retryDelay *= 2;
        } else {
          throw new Error("Unable to fetch historical data at this time");
        }
      }
    }
  }

  return await getCachedOHLCV(symbol, interval, from, to);
}
