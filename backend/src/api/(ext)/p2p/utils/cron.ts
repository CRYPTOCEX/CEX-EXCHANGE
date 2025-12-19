import { logger } from "@b/utils/console";
import { broadcastStatus, broadcastLog } from "@b/cron/broadcast";
import { handleP2PTradeTimeouts } from "./p2p-trade-timeout";

/**
 * Cron job to automatically expire P2P trades that have passed their expiration date
 * Run frequency: Every 5 minutes
 * Schedule: every 5 minutes
 */
export async function p2pTradeTimeout() {
  const cronName = "p2pTradeTimeout";
  const startTime = Date.now();

  try {
    broadcastStatus(cronName, "running");
    broadcastLog(cronName, "Starting P2P trade timeout job");

    await handleP2PTradeTimeouts();

    const duration = Date.now() - startTime;
    broadcastStatus(cronName, "completed", { duration });
    broadcastLog(
      cronName,
      `P2P trade timeout job completed successfully`,
      "success"
    );

  } catch (error: any) {
    logger.error("P2P_CRON", "P2P trade timeout job failed", error);
    broadcastStatus(cronName, "failed", {
      duration: Date.now() - startTime,
    });
    broadcastLog(
      cronName,
      `P2P trade timeout job failed: ${error.message}`,
      "error"
    );
    throw error;
  }
}

// Export for direct execution
export default p2pTradeTimeout;
