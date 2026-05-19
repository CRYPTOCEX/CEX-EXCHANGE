"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletPnlTaskQueue = void 0;
const console_1 = require("@b/utils/console");
class WalletPnlTaskQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }
    async add(task) {
        this.queue.push(task);
        if (!this.processing) {
            this.processing = true;
            await this.processQueue();
            this.processing = false;
        }
    }
    async processQueue() {
        while (this.queue.length > 0) {
            const task = this.queue.shift();
            if (task) {
                try {
                    await task();
                }
                catch (error) {
                    console_1.logger.error("WALLET", "Error processing wallet PnL task", error);
                }
            }
        }
    }
}
exports.walletPnlTaskQueue = new WalletPnlTaskQueue();
