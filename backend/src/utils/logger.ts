// File: backend/utils/logger.ts

import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const logging = createLogger({
  levels: logLevels,
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.json()
  ),
  exceptionHandlers: [new transports.File({ filename: "logs/exceptions.log" })],
});

const categoryTransports = new Map<string, DailyRotateFile>();

// Interval in milliseconds to deduplicate error messages
const dedupInterval = process.env.DEDUP_INTERVAL
  ? parseInt(process.env.DEDUP_INTERVAL, 10)
  : 60 * 60 * 1000;

// Maximum number of unique error messages to store in cache
const MAX_CACHE_SIZE = process.env.MAX_CACHE_SIZE
  ? parseInt(process.env.MAX_CACHE_SIZE, 10)
  : 1000;

function ensureCategoryTransport(category: string) {
  if (!categoryTransports.has(category)) {
    const transport = new DailyRotateFile({
      filename: `logs/%DATE%.log`,
      datePattern: "YYYY-MM-DD",
      level: "info",
      handleExceptions: true,
      maxSize: "20m",
      maxFiles: "14d",
      format: format.combine(
        format.label({ label: category }),
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.json()
      ),
    });

    logging.add(transport);
    categoryTransports.set(category, transport);
  }
}

function logger(
  level: keyof typeof logLevels,
  category: string,
  file: any,
  message: string
) {
  ensureCategoryTransport(category);
  logging.log(level, message, { category, file });
}

// Deduplication cache for error messages using a Map for LRU strategy
const errorCache = new Map<
  string,
  { count: number; timeout: NodeJS.Timeout }
>();

/**
 * Ensures that the errorCache does not exceed the maximum capacity.
 * Evicts the oldest entry if necessary.
 */
function ensureCacheCapacity() {
  if (errorCache.size >= MAX_CACHE_SIZE) {
    // Delete the oldest entry (first inserted)
    const oldestKey = errorCache.keys().next().value;
    const oldestEntry = errorCache.get(oldestKey);
    if (oldestEntry) {
      clearTimeout(oldestEntry.timeout);
    }
    errorCache.delete(oldestKey);
  }
}

export function logInfo(category: string, message: string, filePath: string) {
  console.info(message);
  logger("info", category, filePath, message);
}

export function logError(category: string, error: Error, filePath: string) {
  const errorMessage = error.message || error.stack || "Unknown error";

  // If this error message is already in the cache, increment the count and update its position for LRU.
  if (errorCache.has(errorMessage)) {
    const entry = errorCache.get(errorMessage)!;
    entry.count += 1;
    // Refresh LRU: delete and set to move it to the most recent end.
    errorCache.delete(errorMessage);
    errorCache.set(errorMessage, entry);
    return;
  }

  // Ensure we don't exceed cache capacity
  ensureCacheCapacity();

  // First occurrence: log it immediately.
  console.error(errorMessage);
  logger("error", category, filePath, errorMessage);

  // Set up deduplication: after the interval, log a summary if duplicates occurred.
  const timeout = setTimeout(() => {
    const entry = errorCache.get(errorMessage);
    if (entry && entry.count > 1) {
      const summaryMessage = `The error '${errorMessage}' occurred ${entry.count - 1} additional times within ${dedupInterval / 1000} seconds.`;
      console.error(summaryMessage);
      logger("error", category, filePath, summaryMessage);
    }
    errorCache.delete(errorMessage);
  }, dedupInterval);

  errorCache.set(errorMessage, { count: 1, timeout });
}

export default logger;
