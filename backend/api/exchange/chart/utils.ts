// utils.ts
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { RedisSingleton } from "@b/utils/redis";
import { baseNumberSchema } from "@b/utils/schema";

const redis = RedisSingleton.getInstance();
const cacheDirPath = path.resolve(process.cwd(), "data", "chart");

// Ensure cache directory exists
if (!fs.existsSync(cacheDirPath)) {
  fs.mkdirSync(cacheDirPath, { recursive: true });
}

export const baseChartDataPointSchema = {
  timestamp: baseNumberSchema("Timestamp for the data point"),
  open: baseNumberSchema("Opening price for the data interval"),
  high: baseNumberSchema("Highest price during the data interval"),
  low: baseNumberSchema("Lowest price during the data interval"),
  close: baseNumberSchema("Closing price for the data interval"),
  volume: baseNumberSchema("Volume of trades during the data interval"),
};

function getCacheKey(symbol: string, interval: string) {
  return `ohlcv:${symbol}:${interval}`;
}

function compress(data: any): Buffer {
  return zlib.gzipSync(JSON.stringify(data));
}

function decompress(data: Buffer): any {
  return JSON.parse(zlib.gunzipSync(data).toString());
}

function getCacheFilePath(symbol: string, interval: string) {
  const symbolDirPath = path.join(cacheDirPath, symbol);
  if (!fs.existsSync(symbolDirPath)) {
    fs.mkdirSync(symbolDirPath, { recursive: true });
  }
  return path.join(symbolDirPath, `${interval}.json.gz`);
}

async function loadCacheFromFile(
  symbol: string,
  interval: string
): Promise<any[]> {
  const cacheFilePath = getCacheFilePath(symbol, interval);
  if (fs.existsSync(cacheFilePath)) {
    const compressedData = await fs.promises.readFile(cacheFilePath);
    return decompress(compressedData);
  }
  return [];
}

async function saveCacheToFile(symbol: string, interval: string, data: any[]) {
  const cacheFilePath = getCacheFilePath(symbol, interval);
  const compressedData = compress(data);
  await fs.promises.writeFile(cacheFilePath, compressedData);
}

export async function getCachedOHLCV(
  symbol: string,
  interval: string,
  from: number,
  to: number
): Promise<any[]> {
  const cacheKey = getCacheKey(symbol, interval);

  // Try to get data from Redis
  let cachedData = await redis.get(cacheKey);

  if (!cachedData) {
    // If not in Redis, try to load from file
    const dataFromFile = await loadCacheFromFile(symbol, interval);
    if (dataFromFile.length > 0) {
      await redis.set(cacheKey, JSON.stringify(dataFromFile));
      cachedData = JSON.stringify(dataFromFile);
    } else {
      return [];
    }
  }

  const intervalCache: any[] = JSON.parse(cachedData);

  // Use binary search to find the start and end indices
  const startIndex = binarySearch(intervalCache, from);
  const endIndex = binarySearch(intervalCache, to, true);

  return intervalCache.slice(startIndex, endIndex + 1);
}

function binarySearch(arr: any[], target: number, findEnd = false): number {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid][0] === target) {
      return mid;
    }
    if (arr[mid][0] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return findEnd ? right : left;
}

export async function saveOHLCVToCache(
  symbol: string,
  interval: string,
  data: any[]
) {
  const cacheKey = getCacheKey(symbol, interval);
  let intervalCache: any[] = [];

  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    intervalCache = JSON.parse(cachedData);
  }

  const updatedCache = mergeAndSortData(intervalCache, data);

  await redis.set(cacheKey, JSON.stringify(updatedCache));
  await saveCacheToFile(symbol, interval, updatedCache);
}

function mergeAndSortData(existingData: any[], newData: any[]): any[] {
  const merged = [...existingData, ...newData];
  merged.sort((a, b) => a[0] - b[0]);

  // Remove duplicates
  return merged.filter(
    (item, index, self) => index === 0 || item[0] !== self[index - 1][0]
  );
}

export function intervalToMilliseconds(interval: string): number {
  const intervalMap: { [key: string]: number } = {
    "1m": 60 * 1000,
    "3m": 3 * 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "30m": 30 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "2h": 2 * 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "8h": 8 * 60 * 60 * 1000,
    "12h": 12 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "3d": 3 * 24 * 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
    "1M": 30 * 24 * 60 * 60 * 1000,
  };
  return intervalMap[interval] || 0;
}

export function findGapsInCachedData(
  cachedData: any[],
  from: number,
  to: number,
  interval: string
) {
  const gaps: any = [];
  let currentStart = from;
  const currentTimestamp = Date.now();
  const intervalMs = intervalToMilliseconds(interval);

  for (const bar of cachedData) {
    if (bar[0] > currentStart) {
      gaps.push({ gapStart: currentStart, gapEnd: bar[0] });
    }
    currentStart = bar[0] + intervalMs;
  }

  // Adjust the final gap to skip the current ongoing bar
  const adjustedTo =
    to > currentTimestamp - intervalMs ? currentTimestamp - intervalMs : to;

  if (currentStart < adjustedTo) {
    gaps.push({ gapStart: currentStart, gapEnd: adjustedTo });
  }

  return gaps;
}
