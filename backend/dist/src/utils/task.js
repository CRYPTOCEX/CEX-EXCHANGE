"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskQueue = exports.TaskQueue = void 0;
const events_1 = require("events");
class TaskQueue extends events_1.EventEmitter {
    constructor(concurrency = 5, maxQueueLength) {
        super();
        this.queue = [];
        this.activeCount = 0;
        this.paused = false;
        this.concurrency = concurrency;
        this.maxQueueLength = maxQueueLength;
    }
    add(task, options = {}) {
        return new Promise((resolve, reject) => {
            var _a;
            if (this.maxQueueLength && this.queue.length >= this.maxQueueLength) {
                return reject(new Error("Task queue is full"));
            }
            const taskItem = {
                task,
                priority: (_a = options.priority) !== null && _a !== void 0 ? _a : 0,
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
    insertTaskItem(taskItem) {
        const index = this.queue.findIndex((item) => item.priority < taskItem.priority ||
            (item.priority === taskItem.priority && item.addedAt > taskItem.addedAt));
        if (index === -1) {
            this.queue.push(taskItem);
        }
        else {
            this.queue.splice(index, 0, taskItem);
        }
    }
    processQueue() {
        if (this.paused)
            return;
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
    async executeTask(taskItem) {
        this.emit("taskStarted");
        try {
            if (taskItem.timeoutMs) {
                await this.runWithTimeout(taskItem.task, taskItem.timeoutMs);
            }
            else {
                await taskItem.task();
            }
            taskItem.resolve();
            this.emit("taskCompleted");
        }
        catch (error) {
            if (taskItem.retryOptions &&
                taskItem.currentRetryCount < taskItem.retryOptions.maxRetries) {
                taskItem.currentRetryCount++;
                this.emit("taskRetried", {
                    error,
                    retryCount: taskItem.currentRetryCount,
                });
                const delay = taskItem.retryOptions.initialDelayMs *
                    (taskItem.retryOptions.factor || 2) **
                        (taskItem.currentRetryCount - 1);
                setTimeout(() => {
                    this.insertTaskItem(taskItem);
                    this.processQueue();
                }, delay);
            }
            else {
                taskItem.reject(error);
                this.emit("taskError", error);
            }
        }
    }
    runWithTimeout(task, timeoutMs) {
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
    pause() {
        this.paused = true;
    }
    resume() {
        if (!this.paused)
            return;
        this.paused = false;
        this.processQueue();
    }
    clearQueue() {
        this.queue = [];
    }
    setConcurrency(newConcurrency) {
        this.concurrency = newConcurrency;
        this.processQueue();
    }
    awaitDrain() {
        if (this.queue.length === 0 && this.activeCount === 0) {
            return Promise.resolve();
        }
        if (!this.drainPromise) {
            let resolveFn;
            const promise = new Promise((resolve) => {
                resolveFn = resolve;
            });
            this.drainPromise = { resolve: resolveFn, promise };
        }
        return this.drainPromise.promise;
    }
    getQueueLength() {
        return this.queue.length;
    }
    getActiveCount() {
        return this.activeCount;
    }
}
exports.TaskQueue = TaskQueue;
exports.taskQueue = new TaskQueue();
