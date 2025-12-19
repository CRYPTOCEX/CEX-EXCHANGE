/**
 * Copy Trading Queue System
 *
 * Implements a high-performance queue-based system for processing copy trades
 * to prevent blocking the main thread when leaders have many followers.
 *
 * Features:
 * - Non-blocking async processing
 * - Batch processing for efficiency
 * - Concurrent follower processing with configurable limits
 * - Automatic retry logic for failed trades
 * - Priority queue for time-sensitive trades
 */

import { logger } from "@b/utils/console";
import { processCopyOrder } from "./copyProcessor";
import { models } from "@b/db";
import { Op } from "sequelize";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Maximum number of followers to process concurrently per leader trade
  MAX_CONCURRENT_FOLLOWERS: 10,

  // Queue processing interval (milliseconds)
  QUEUE_PROCESS_INTERVAL: 100, // Process every 100ms

  // Maximum queue size before warning
  MAX_QUEUE_SIZE: 1000,

  // Batch size for database queries
  BATCH_SIZE: 50,

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CopyTradeTask {
  id: string; // Unique task ID
  leaderTradeId: string;
  leaderId: string;
  symbol: string;
  priority: number; // Higher = more urgent
  createdAt: Date;
  retries: number;
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  averageProcessingTime: number;
}

// ============================================================================
// QUEUE IMPLEMENTATION
// ============================================================================

export class CopyTradeQueue {
  private static instance: CopyTradeQueue | null = null;

  private pendingQueue: CopyTradeTask[] = [];
  private processingSet: Set<string> = new Set();
  private completedCount: number = 0;
  private failedCount: number = 0;
  private processingTimes: number[] = [];

  private isProcessing: boolean = false;
  private processInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): CopyTradeQueue {
    if (!CopyTradeQueue.instance) {
      CopyTradeQueue.instance = new CopyTradeQueue();
    }
    return CopyTradeQueue.instance;
  }

  /**
   * Start the queue processor
   */
  public start(): void {
    if (this.processInterval) {
      logger.warn("COPY_TRADING", "Queue processor already running");
      return;
    }

    this.processInterval = setInterval(() => {
      this.processQueue().catch((error) => {
        logger.error("COPY_TRADING", "Queue processing error", error);
      });
    }, CONFIG.QUEUE_PROCESS_INTERVAL);

    logger.info("COPY_TRADING", "Copy trade queue processor started");
  }

  /**
   * Stop the queue processor
   */
  public stop(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      logger.info("COPY_TRADING", "Copy trade queue processor stopped");
    }
  }

  /**
   * Add a leader trade to the processing queue
   */
  public async enqueue(
    leaderTradeId: string,
    leaderId: string,
    symbol: string,
    priority: number = 0
  ): Promise<void> {
    // Check queue size
    if (this.pendingQueue.length >= CONFIG.MAX_QUEUE_SIZE) {
      logger.warn("COPY_TRADING", `Queue size limit reached (${CONFIG.MAX_QUEUE_SIZE})`);
    }

    const task: CopyTradeTask = {
      id: `${leaderTradeId}_${Date.now()}`,
      leaderTradeId,
      leaderId,
      symbol,
      priority,
      createdAt: new Date(),
      retries: 0,
    };

    // Insert based on priority (higher priority first)
    const insertIndex = this.pendingQueue.findIndex(t => t.priority < priority);
    if (insertIndex === -1) {
      this.pendingQueue.push(task);
    } else {
      this.pendingQueue.splice(insertIndex, 0, task);
    }

    logger.debug("COPY_TRADING", `Enqueued trade ${leaderTradeId} (priority: ${priority}, queue size: ${this.pendingQueue.length})`);
  }

  /**
   * Process the queue in batches
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.pendingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Take next task from queue
      const task = this.pendingQueue.shift();
      if (!task) {
        return;
      }

      this.processingSet.add(task.id);
      const startTime = Date.now();

      try {
        await this.processTask(task);

        // Track success
        this.completedCount++;
        const processingTime = Date.now() - startTime;
        this.processingTimes.push(processingTime);

        // Keep only last 100 processing times for average calculation
        if (this.processingTimes.length > 100) {
          this.processingTimes.shift();
        }

        logger.debug("COPY_TRADING", `Completed task ${task.id} in ${processingTime}ms`);
      } catch (error) {
        logger.error("COPY_TRADING", `Task ${task.id} failed`, error);

        // Retry logic
        if (task.retries < CONFIG.MAX_RETRIES) {
          task.retries++;
          logger.info("COPY_TRADING", `Retrying task ${task.id} (attempt ${task.retries}/${CONFIG.MAX_RETRIES})`);

          // Add back to queue with delay
          setTimeout(() => {
            this.pendingQueue.push(task);
          }, CONFIG.RETRY_DELAY * task.retries);
        } else {
          this.failedCount++;
          logger.error("COPY_TRADING", `Task ${task.id} failed after ${CONFIG.MAX_RETRIES} retries`);
        }
      } finally {
        this.processingSet.delete(task.id);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single task by replicating to all followers
   */
  private async processTask(task: CopyTradeTask): Promise<void> {
    // Get the leader trade with leader info
    const leaderTrade = await models.copyTradingTrade.findByPk(task.leaderTradeId, {
      include: [
        {
          model: models.copyTradingLeader,
          as: "leader",
          include: [{ model: models.user, as: "user" }],
        },
      ],
    });
    if (!leaderTrade) {
      throw new Error(`Leader trade ${task.leaderTradeId} not found`);
    }

    const leaderTradeData = leaderTrade as any;

    // Get leader's wallet balance for the quote currency (for proportional calculations)
    const [baseCurrency, quoteCurrency] = task.symbol.split("/");
    let leaderBalance = 0;
    try {
      const leaderWallet = await models.wallet.findOne({
        where: {
          userId: leaderTradeData.leader?.userId,
          currency: quoteCurrency,
          type: "ECO",
        },
      });
      leaderBalance = leaderWallet ? parseFloat((leaderWallet as any).balance) : 0;
    } catch (e) {
      // Default to 0 if wallet not found
    }

    // Get all ACTIVE followers for this leader with the same symbol allocation
    const followers = await models.copyTradingFollower.findAll({
      where: {
        leaderId: task.leaderId,
        status: "ACTIVE",
      },
      include: [
        {
          model: models.copyTradingFollowerAllocation,
          as: "allocations",
          where: {
            symbol: task.symbol,
            isActive: true,
          },
          required: true,
        },
        {
          model: models.user,
          as: "user",
        },
      ],
    });

    if (followers.length === 0) {
      logger.debug("COPY_TRADING", `No active followers for leader ${task.leaderId} on ${task.symbol}`);
      return;
    }

    logger.info("COPY_TRADING", `Processing ${followers.length} followers for trade ${task.leaderTradeId}`);

    // Process followers in batches with concurrency limit
    await this.processFollowersBatch(followers as any[], leaderTradeData, leaderBalance);
  }

  /**
   * Process followers in concurrent batches
   */
  private async processFollowersBatch(
    followers: any[],
    leaderTrade: any,
    leaderBalance: number
  ): Promise<void> {
    const batchSize = CONFIG.MAX_CONCURRENT_FOLLOWERS;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < followers.length; i += batchSize) {
      const batch = followers.slice(i, i + batchSize);

      // Process batch concurrently
      const results = await Promise.allSettled(
        batch.map(follower => this.processFollowerCopy(follower, leaderTrade, leaderBalance))
      );

      // Count successes and failures
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.success) {
          successCount++;
        } else {
          failCount++;
          const follower = batch[index];
          const error = result.status === "rejected" ? result.reason : result.value.error;
          logger.warn("COPY_TRADING", `Failed to copy trade for follower ${follower.id}: ${error}`);
        }
      });
    }

    logger.info("COPY_TRADING", `Batch complete: ${successCount} succeeded, ${failCount} failed`);
  }

  /**
   * Process copy for a single follower
   */
  private async processFollowerCopy(
    follower: any,
    leaderTrade: any,
    leaderBalance: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await processCopyOrder({
        leaderTrade,
        follower,
        leaderBalance,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get queue statistics
   */
  public getStats(): QueueStats {
    const avgTime = this.processingTimes.length > 0
      ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
      : 0;

    return {
      pending: this.pendingQueue.length,
      processing: this.processingSet.size,
      completed: this.completedCount,
      failed: this.failedCount,
      averageProcessingTime: Math.round(avgTime),
    };
  }

  /**
   * Clear all statistics
   */
  public clearStats(): void {
    this.completedCount = 0;
    this.failedCount = 0;
    this.processingTimes = [];
  }

  /**
   * Get current queue size
   */
  public getQueueSize(): number {
    return this.pendingQueue.length;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Add a leader trade to the copy queue (non-blocking)
 */
export async function queueLeaderTrade(
  leaderTradeId: string,
  leaderId: string,
  symbol: string,
  priority: number = 0
): Promise<void> {
  const queue = CopyTradeQueue.getInstance();
  await queue.enqueue(leaderTradeId, leaderId, symbol, priority);
}

/**
 * Start the queue processor
 */
export function startCopyQueue(): void {
  const queue = CopyTradeQueue.getInstance();
  queue.start();
}

/**
 * Stop the queue processor
 */
export function stopCopyQueue(): void {
  const queue = CopyTradeQueue.getInstance();
  queue.stop();
}

/**
 * Get queue statistics
 */
export function getCopyQueueStats(): QueueStats {
  const queue = CopyTradeQueue.getInstance();
  return queue.getStats();
}
