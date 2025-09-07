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

// Cache locks to prevent concurrent access issues
const cacheLocks = new Map<string, Promise<any>>();

export async function getCachedOHLCV(
  symbol: string,
  interval: string,
  from: number,
  to: number
): Promise<any[]> {
  const cacheKey = getCacheKey(symbol, interval);

  // Check if there's an ongoing cache operation
  if (cacheLocks.has(cacheKey)) {
    await cacheLocks.get(cacheKey);
  }

  try {
    // Try to get data from Redis with timeout
    let cachedData = await Promise.race([
      redis.get(cacheKey),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Redis timeout')), 3000)
      )
    ]).catch(() => null);

    if (!cachedData) {
      // Create a lock for file operations
      const lockPromise = loadCacheFromFileWithLock(symbol, interval, cacheKey);
      cacheLocks.set(cacheKey, lockPromise);
      
      try {
        const dataFromFile = await lockPromise;
        if (dataFromFile.length > 0) {
          // Try to save to Redis with timeout
          await Promise.race([
            redis.set(cacheKey, JSON.stringify(dataFromFile)),
            new Promise<void>((_, reject) => 
              setTimeout(() => reject(new Error('Redis SET timeout')), 3000)
            )
          ]).catch(() => {
            console.warn(`Failed to cache data in Redis for ${cacheKey}`);
          });
          cachedData = JSON.stringify(dataFromFile);
        } else {
          return [];
        }
      } finally {
        cacheLocks.delete(cacheKey);
      }
    }

    const intervalCache: any[] = JSON.parse(cachedData);

    // Use binary search to find the start and end indices
    const startIndex = binarySearch(intervalCache, from);
    const endIndex = binarySearch(intervalCache, to, true);

    return intervalCache.slice(startIndex, endIndex + 1);
  } catch (error) {
    console.error(`Error getting cached OHLCV for ${cacheKey}:`, error);
    return [];
  }
}

async function loadCacheFromFileWithLock(
  symbol: string, 
  interval: string, 
  cacheKey: string
): Promise<any[]> {
  try {
    return await loadCacheFromFile(symbol, interval);
  } catch (error) {
    console.error(`Error loading cache from file for ${cacheKey}:`, error);
    return [];
  }
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
  
  // Wait for any ongoing cache operations
  if (cacheLocks.has(cacheKey)) {
    await cacheLocks.get(cacheKey);
  }

  // Create a lock for this save operation
  const savePromise = performCacheSave(symbol, interval, data, cacheKey);
  cacheLocks.set(cacheKey, savePromise);
  
  try {
    await savePromise;
  } finally {
    cacheLocks.delete(cacheKey);
  }
}

async function performCacheSave(
  symbol: string,
  interval: string,
  data: any[],
  cacheKey: string
): Promise<void> {
  try {
    let intervalCache: any[] = [];

    // Try to get existing data with timeout
    const cachedData = await Promise.race([
      redis.get(cacheKey),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Redis GET timeout')), 3000)
      )
    ]).catch(() => null);

    if (cachedData) {
      try {
        intervalCache = JSON.parse(cachedData);
      } catch (error) {
        console.warn(`Failed to parse cached data for ${cacheKey}, using empty array`);
        intervalCache = [];
      }
    }

    const updatedCache = mergeAndSortData(intervalCache, data);

    // Save to Redis with timeout
    await Promise.race([
      redis.set(cacheKey, JSON.stringify(updatedCache)),
      new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Redis SET timeout')), 3000)
      )
    ]).catch((error) => {
      console.warn(`Failed to save cache to Redis for ${cacheKey}:`, error);
    });

    // Save to file with timeout
    await Promise.race([
      saveCacheToFile(symbol, interval, updatedCache),
      new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('File save timeout')), 5000)
      )
    ]).catch((error) => {
      console.warn(`Failed to save cache to file for ${cacheKey}:`, error);
    });
  } catch (error) {
    console.error(`Error in performCacheSave for ${cacheKey}:`, error);
    throw error;
  }
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
