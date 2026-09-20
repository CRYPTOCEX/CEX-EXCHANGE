"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletPnlTaskQueue = void 0;
const console_1 = require("@b/utils/console");
class WalletPnlTaskQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }
    add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            void this.drain();
        });
    }
    async drain() {
        if (this.processing)
            return;
        this.processing = true;
        try {
            while (this.queue.length > 0) {
                const entry = this.queue.shift();
                if (!entry)
                    continue;
                try {
                    await entry.task();
                    entry.resolve();
                }
                catch (error) {
                    console_1.logger.error("WALLET", "Error processing wallet PnL task", error);
                    entry.reject(error instanceof Error ? error : new Error(String(error)));
                }
            }
        }
        finally {
            this.processing = false;
        }
    }
}
exports.walletPnlTaskQueue = new WalletPnlTaskQueue();
