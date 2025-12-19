import { logger } from "@b/utils/console";
import { BinaryOrderService } from "@b/api/exchange/binary/order/util/BinaryOrderService";
import { broadcastStatus, broadcastLog } from "../broadcast";

/**
 * Processes pending binary orders.
 * @param shouldBroadcast - If true, broadcasts status messages (useful for cron jobs).
 */
export async function processPendingOrders(shouldBroadcast: boolean = true) {
  const cronName = "processPendingOrders";
  try {
    if (shouldBroadcast) {
      broadcastStatus(cronName, "running");
      broadcastLog(cronName, "Starting processing pending orders");
    }

    // Pass the flag to BinaryOrderService so it can conditionally log as well.
    await BinaryOrderService.processPendingOrders(shouldBroadcast);

    if (shouldBroadcast) {
      broadcastStatus(cronName, "completed");
      broadcastLog(cronName, "Processing pending orders completed", "success");
    }
  } catch (error: any) {
    logger.error("CRON", "Processing pending orders failed", error);
    if (shouldBroadcast) {
      broadcastStatus(cronName, "failed");
      broadcastLog(
        cronName,
        `Processing pending orders failed: ${error.message}`,
        "error"
      );
    }
    throw error;
  }
}
