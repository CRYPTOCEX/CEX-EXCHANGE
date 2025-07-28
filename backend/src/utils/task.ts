// backend/src/api/utils/taskQueue.ts
import { EventEmitter } from "events";

export interface TaskQueueEvents {
  taskAdded: void;
  taskStarted: void;
  taskCompleted: void;
  taskError: Error;
  taskRetried: { error: Error; retryCount: number };
  drain: void;
}

export interface RetryOptions {
  maxRetries: number; // Maximum number of retries allowed
  initialDelayMs: number; // Delay before the first retry (in ms)
  factor?: number; // Exponential backoff multiplier (default is 2)
}

export interface TaskOptions {
  priority?: number; // Higher number = higher priority (default is 0)
  timeoutMs?: number;
  retryOptions?: RetryOptions;
}

interface TaskItem {
  task: () => Promise<void>;
  priority: number;
  addedAt: number;
  resolve: () => void;
  reject: (error: Error) => void;
  timeoutMs?: number;
  retryOptions?: RetryOptions;
  currentRetryCount: number;
}

export class TaskQueue extends EventEmitter {
  private queue: TaskItem[] = [];
  private activeCount = 0;
  private concurrency: number;
  private paused = false;
  private maxQueueLength?: number;
  private drainPromise?: { resolve: () => void; promise: Promise<void> };

  /**
   * @param concurrency Maximum number of tasks to process concurrently.
   * @param maxQueueLength Optional maximum length of the queue. New tasks beyond this limit will be rejected.
   */
  constructor(concurrency: number = 5, maxQueueLength?: number) {
    super();
    this.concurrency = concurrency;
    this.maxQueueLength = maxQueueLength;
  }

  /**
   * Adds a task to the queue with optional settings.
   *
   * @param task A function that returns a Promise.
   * @param options Task options such as priority, timeout, and retry options.
   * @returns A Promise that resolves when the task completes successfully.
   */
  public add(
    task: () => Promise<void>,
    options: TaskOptions = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.maxQueueLength && this.queue.length >= this.maxQueueLength) {
        return reject(new Error("Task queue is full"));
      }

      const taskItem: TaskItem = {
        task,
        priority: options.priority ?? 0,
        addedAt: Date.now(),
        resolve,
        reject,
        timeoutMs: options.timeoutMs,
        retryOptions: options.retryOptions,
        currentRetryCount: 0,
      };

      this.insertTaskItem(taskItem);
      this.emit("taskAdded");
      this.processQueue();
    });
  }

  /**
   * Inserts a task item into the queue in sorted order (by priority and then timestamp).
   */
  private insertTaskItem(taskItem: TaskItem): void {
    // Insert taskItem so that higher priority tasks come first.
    const index = this.queue.findIndex(
      (item) =>
        item.priority < taskItem.priority ||
        (item.priority === taskItem.priority && item.addedAt > taskItem.addedAt)
    );
    if (index === -1) {
      this.queue.push(taskItem);
    } else {
      this.queue.splice(index, 0, taskItem);
    }
  }

  /**
   * Processes tasks from the queue up to the concurrency limit.
   */
  private processQueue(): void {
    if (this.paused) return;

    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      const taskItem = this.queue.shift();
      if (taskItem) {
        this.activeCount++;
        this.executeTask(taskItem).finally(() => {
          this.activeCount--;
          if (this.queue.length === 0 && this.activeCount === 0) {
            this.emit("drain");
            if (this.drainPromise) {
              this.drainPromise.resolve();
              this.drainPromise = undefined;
            }
          }
          this.processQueue();
        });
      }
    }
  }

  /**
   * Executes a given task item with timeout and retry logic.
   *
   * @param taskItem The task item to execute.
   */
  private async executeTask(taskItem: TaskItem): Promise<void> {
    this.emit("taskStarted");
    try {
      if (taskItem.timeoutMs) {
        await this.runWithTimeout(taskItem.task, taskItem.timeoutMs);
      } else {
        await taskItem.task();
      }
      taskItem.resolve();
      this.emit("taskCompleted");
    } catch (error) {
      if (
        taskItem.retryOptions &&
        taskItem.currentRetryCount < taskItem.retryOptions.maxRetries
      ) {
        taskItem.currentRetryCount++;
        this.emit("taskRetried", {
          error,
          retryCount: taskItem.currentRetryCount,
        });
        const delay =
          taskItem.retryOptions.initialDelayMs *
          (taskItem.retryOptions.factor || 2) **
            (taskItem.currentRetryCount - 1);
        // Reinsert the task after the computed delay.
        setTimeout(() => {
          this.insertTaskItem(taskItem);
          this.processQueue();
        }, delay);
      } else {
        taskItem.reject(error);
        this.emit("taskError", error);
      }
    }
  }

  /**
   * Executes a task with a timeout.
   *
   * @param task A function that returns a Promise.
   * @param timeoutMs Timeout in milliseconds.
   * @returns A Promise that rejects if the task does not complete in time.
   */
  private runWithTimeout(
    task: () => Promise<void>,
    timeoutMs: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Task timeout exceeded"));
      }, timeoutMs);

      task()
        .then(() => {
          clearTimeout(timeoutId);
          resolve();
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
    });
  }

  /**
   * Pauses the processing of tasks.
   */
  public pause(): void {
    this.paused = true;
  }

  /**
   * Resumes processing of tasks.
   */
  public resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.processQueue();
  }

  /**
   * Clears all pending tasks from the queue.
   */
  public clearQueue(): void {
    this.queue = [];
  }

  /**
   * Dynamically sets a new concurrency limit.
   *
   * @param newConcurrency The new maximum number of concurrent tasks.
   */
  public setConcurrency(newConcurrency: number): void {
    this.concurrency = newConcurrency;
    this.processQueue();
  }

  /**
   * Returns a promise that resolves when the queue is drained (no pending or active tasks).
   */
  public awaitDrain(): Promise<void> {
    if (this.queue.length === 0 && this.activeCount === 0) {
      return Promise.resolve();
    }
    if (!this.drainPromise) {
      let resolveFn!: () => void;
      const promise = new Promise<void>((resolve) => {
        resolveFn = resolve;
      });
      this.drainPromise = { resolve: resolveFn, promise };
    }
    return this.drainPromise.promise;
  }

  /**
   * Returns the number of tasks waiting in the queue.
   */
  public getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Returns the number of tasks currently being processed.
   */
  public getActiveCount(): number {
    return this.activeCount;
  }
}

export const taskQueue = new TaskQueue();
