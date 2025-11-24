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

// Request deduplication cache
const activeRequests = new Map<string, Promise<any>>();

export default async (data: Handler) => {
  const { query } = data;
  
  // Validate required parameters
  if (!query.symbol || !query.interval || !query.from || !query.to || !query.duration) {
    throw new Error('Missing required parameters: symbol, interval, from, to, duration');
  }
  
  // Create request key for deduplication
  const requestKey = `${query.symbol}-${query.interval}-${query.from}-${query.to}`;
  
  // Check if same request is already in progress
  if (activeRequests.has(requestKey)) {
    console.log(`Deduplicating request for ${requestKey}`);
    return await activeRequests.get(requestKey);
  }
  
  // Add timeout to prevent hanging requests
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout after 20 seconds')), 20000);
  });
  
  // Create the main request promise
  const requestPromise = getHistoricalOHLCV(
    query.symbol,
    query.interval,
    Number(query.from),
    Number(query.to),
    Number(query.duration)
  );
  
  // Store the request promise for deduplication
  activeRequests.set(requestKey, requestPromise);
  
  try {
    const result = await Promise.race([requestPromise, timeoutPromise]);
    return result;
  } catch (error) {
    console.error('Chart API error:', {
      symbol: query.symbol,
      interval: query.interval,
      from: query.from,
      to: query.to,
      error: error.message,
      requestKey
    });
    throw error;
  } finally {
    // Clean up the active request
    activeRequests.delete(requestKey);
  }
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
  try {
    const unblockTime = await loadBanStatus();
    if (await handleBanStatus(unblockTime)) {
      return await getCachedOHLCV(symbol, interval, from, to);
    }

    // Use timeout for exchange initialization
    const exchange = await Promise.race([
      (ExchangeManager as any).startExchange(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Exchange initialization timeout')), 10000)
      )
    ]);

    if (!exchange) {
      console.warn('Exchange not available, returning cached data only');
      return await getCachedOHLCV(symbol, interval, from, to);
    }

    const cachedData = await getCachedOHLCV(symbol, interval, from, to);
    const expectedBars = Math.ceil(
      (to - from) / intervalToMilliseconds(interval)
    );

    // Return cached data if we have enough
    if (cachedData.length >= expectedBars * 0.9) { // Allow 10% tolerance
      return cachedData;
    }

    const missingIntervals = findGapsInCachedData(cachedData, from, to, interval);
    const currentTimestamp = Date.now();
    const intervalMs = intervalToMilliseconds(interval);

    // Limit concurrent gap filling to prevent overwhelming the exchange
    const maxConcurrentRequests = 2;
    const intervalChunks: Array<Array<{gapStart: number, gapEnd: number}>> = [];
    
    for (let i = 0; i < missingIntervals.length; i += maxConcurrentRequests) {
      intervalChunks.push(missingIntervals.slice(i, i + maxConcurrentRequests));
    }

    for (const chunk of intervalChunks) {
      const promises = chunk.map(async ({ gapStart, gapEnd }: {gapStart: number, gapEnd: number}) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            if (await handleBanStatus(await loadBanStatus())) {
              return null;
            }

            // Adjust gapEnd to skip the current ongoing bar
            const adjustedGapEnd =
              gapEnd > currentTimestamp - intervalMs
                ? currentTimestamp - intervalMs
                : gapEnd;

            // Add timeout to fetchOHLCV call
            const data = await Promise.race([
              exchange.fetchOHLCV(
                symbol,
                interval,
                gapStart,
                500,
                { until: adjustedGapEnd }
              ),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('fetchOHLCV timeout')), 15000)
              )
            ]);

            if (data && data.length > 0) {
              await saveOHLCVToCache(symbol, interval, data);
            }
            return data;
          } catch (e) {
            console.warn(`Attempt ${attempt} failed for gap ${gapStart}-${gapEnd}:`, e.message);
            if (attempt < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
              retryDelay = Math.min(retryDelay * 1.5, 5000); // Cap at 5 seconds
            } else {
              console.error(`Failed to fetch data for gap ${gapStart}-${gapEnd} after ${maxRetries} attempts`);
              return null;
            }
          }
        }
      });

      // Wait for chunk to complete before proceeding to next chunk
      await Promise.allSettled(promises);
    }

    return await getCachedOHLCV(symbol, interval, from, to);
  } catch (error) {
    console.error('Error in getHistoricalOHLCV:', error);
    // Return cached data as fallback
    try {
      return await getCachedOHLCV(symbol, interval, from, to);
    } catch (cacheError) {
      console.error('Failed to get cached data as fallback:', cacheError);
      return [];
    }
  }
}
