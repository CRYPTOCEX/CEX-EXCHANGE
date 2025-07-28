import Redis from "ioredis";

// Connect to Redis with error handling
let redisClient: Redis | null = null;

try {
  redisClient = new Redis({
    host: "127.0.0.1",
    port: 6379,
    connectTimeout: 1000, // 1 second timeout
    maxRetriesPerRequest: 0, // Don't retry requests
    lazyConnect: true, // Don't connect immediately
  });

  // Handle connection errors gracefully
  redisClient.on("error", (error) => {
    console.warn("Redis connection error:", error.message);
    // Don't throw, just log the warning
  });

  redisClient.on("connect", () => {
    console.log("Redis connected successfully");
  });
} catch (error) {
  console.warn("Failed to initialize Redis client:", error);
  redisClient = null;
}

// Export Redis client with null check methods
export { redisClient };

// Helper functions that handle Redis being unavailable
export const redisGet = async (key: string): Promise<string | null> => {
  if (!redisClient) return null;
  try {
    return await redisClient.get(key);
  } catch (error) {
    console.warn("Redis GET error:", error);
    return null;
  }
};

export const redisSet = async (
  key: string,
  value: string,
  mode?: "EX",
  duration?: number
): Promise<boolean> => {
  if (!redisClient) return false;
  try {
    if (mode && duration) {
      await redisClient.set(key, value, mode, duration);
    } else {
      await redisClient.set(key, value);
    }
    return true;
  } catch (error) {
    console.warn("Redis SET error:", error);
    return false;
  }
};

export const redisDel = async (key: string): Promise<boolean> => {
  if (!redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.warn("Redis DEL error:", error);
    return false;
  }
};
