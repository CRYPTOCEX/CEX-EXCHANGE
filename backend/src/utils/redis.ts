import { Redis, Cluster } from "ioredis";

export class RedisSingleton {
  private static instance: Redis;
  private static isConnecting: boolean = false;

  private constructor() {}

  public static getInstance(): Redis {
    if (!RedisSingleton.instance) {
      if (RedisSingleton.isConnecting) {
        // Wait for existing connection attempt
        return new Promise((resolve) => {
          const checkConnection = () => {
            if (RedisSingleton.instance) {
              resolve(RedisSingleton.instance);
            } else {
              setTimeout(checkConnection, 10);
            }
          };
          checkConnection();
        }) as any;
      }

      RedisSingleton.isConnecting = true;
      
      try {
        RedisSingleton.instance = new Redis({
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379"),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || "0"),
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          connectTimeout: 5000,
          commandTimeout: 5000,
          lazyConnect: true,
          family: 4,
          keepAlive: 30000,
        });

        // Handle connection events
        RedisSingleton.instance.on("error", (error) => {
          console.error("Redis connection error:", error);
        });

        RedisSingleton.instance.on("connect", () => {
          console.log("Redis connected successfully");
        });

        RedisSingleton.instance.on("ready", () => {
          console.log("Redis ready for commands");
        });

        RedisSingleton.instance.on("close", () => {
          console.log("Redis connection closed");
        });

        RedisSingleton.instance.on("reconnecting", () => {
          console.log("Redis reconnecting...");
        });

      } catch (error) {
        console.error("Failed to create Redis instance:", error);
        throw error;
      } finally {
        RedisSingleton.isConnecting = false;
      }
    }
    
    return RedisSingleton.instance;
  }

  // Add method to safely get with timeout
  public static async safeGet(key: string, timeoutMs: number = 3000): Promise<string | null> {
    const redis = this.getInstance();
    
    return Promise.race([
      redis.get(key),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Redis GET timeout')), timeoutMs)
      )
    ]).catch((error) => {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    });
  }

  // Add method to safely set with timeout
  public static async safeSet(key: string, value: string, timeoutMs: number = 3000): Promise<boolean> {
    const redis = this.getInstance();
    
    return Promise.race([
      redis.set(key, value).then(() => true),
      new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Redis SET timeout')), timeoutMs)
      )
    ]).catch((error) => {
      console.error(`Redis SET error for key ${key}:`, error);
      return false;
    });
  }

  // Add cleanup method
  public static async cleanup(): Promise<void> {
    if (RedisSingleton.instance) {
      try {
        await RedisSingleton.instance.quit();
      } catch (error) {
        console.error("Error during Redis cleanup:", error);
      }
      RedisSingleton.instance = null as any;
    }
  }
}

// Export a function that returns the Redis instance
export default function() {
  return RedisSingleton.getInstance();
}
