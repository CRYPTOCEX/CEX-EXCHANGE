// WebWorker for orderbook processing to maintain 60fps
// This worker handles heavy computations off the main thread

interface OrderBookData {
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
}

interface WorkerMessage {
  type: "PROCESS_ORDERBOOK";
  data: OrderBookData;
  aggregation: number;
}

interface ProcessedResult {
  type: "ORDERBOOK_PROCESSED";
  data: OrderBookData;
}

// Handle incoming messages
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, data, aggregation } = e.data;

  switch (type) {
    case "PROCESS_ORDERBOOK": {
      const processed = processOrderbook(data, aggregation);
      const result: ProcessedResult = { type: "ORDERBOOK_PROCESSED", data: processed };
      self.postMessage(result);
      break;
    }
  }
};

/**
 * Process and aggregate order book data
 */
function processOrderbook(data: OrderBookData, aggregation: number): OrderBookData {
  // Aggregate bids (sorted descending by price)
  const aggregatedBids = aggregateLevels(data.bids, aggregation, "bid");

  // Aggregate asks (sorted ascending by price)
  const aggregatedAsks = aggregateLevels(data.asks, aggregation, "ask");

  return {
    bids: aggregatedBids,
    asks: aggregatedAsks,
    timestamp: data.timestamp,
  };
}

/**
 * Aggregate price levels based on aggregation value
 * This groups nearby prices together for cleaner display
 */
function aggregateLevels(
  levels: [number, number][],
  aggregation: number,
  side: "bid" | "ask"
): [number, number][] {
  if (!levels || levels.length === 0) return [];

  // If aggregation is very small (< 0.01), just return sorted data without aggregation
  if (aggregation < 0.01) {
    return side === "bid"
      ? [...levels].sort((a, b) => b[0] - a[0])
      : [...levels].sort((a, b) => a[0] - b[0]);
  }

  const aggregated = new Map<number, number>();

  for (const [price, amount] of levels) {
    // Round price to aggregation level
    // For bids: floor to aggregate (get lower bound)
    // For asks: ceil to aggregate (get upper bound)
    const roundedPrice =
      side === "bid"
        ? Math.floor(price / aggregation) * aggregation
        : Math.ceil(price / aggregation) * aggregation;

    const existing = aggregated.get(roundedPrice) || 0;
    aggregated.set(roundedPrice, existing + amount);
  }

  // Convert back to array and sort
  const result = Array.from(aggregated.entries()) as [number, number][];

  // Sort appropriately
  return side === "bid"
    ? result.sort((a, b) => b[0] - a[0]) // Descending for bids (highest first)
    : result.sort((a, b) => a[0] - b[0]); // Ascending for asks (lowest first)
}

// Export empty object to make TypeScript treat this as a module
export {};
