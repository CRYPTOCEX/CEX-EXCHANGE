import { logger } from "@b/utils/console";

class WalletPnlTaskQueue {
  private queue: (() => Promise<void>)[] = [];
  private processing = false;

  async add(task: () => Promise<void>): Promise<void> {
    this.queue.push(task);
    if (!this.processing) {
      this.processing = true;
      await this.processQueue();
      this.processing = false;
    }
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          logger.error("WALLET", "Error processing wallet PnL task", error);
        }
      }
    }
  }
}

export const walletPnlTaskQueue = new WalletPnlTaskQueue();
