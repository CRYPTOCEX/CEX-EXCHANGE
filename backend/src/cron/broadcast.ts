import { messageBroker } from "@b/handler/Websocket";
import { logger } from "@b/utils/console";

// Forward declaration to avoid circular dependency
let CronJobManager: any = null;

// Lazy load CronJobManager to avoid circular dependency
async function getCronJobManager() {
  if (!CronJobManager) {
    const module = await import("./index");
    CronJobManager = module.default;
  }
  return CronJobManager;
}

export async function broadcastStatus(
  cronName: string,
  status: "idle" | "running" | "completed" | "failed",
  extra: Record<string, any> = {}
) {
  // Update the job status in CronJobManager
  try {
    const Manager = await getCronJobManager();
    const cronJobManager = await Manager.getInstance();
    cronJobManager.updateJobRunningStatus(cronName, status);
  } catch (error) {
    logger.error("CRON", `Failed to update cron status for ${cronName}`, error);
  }

  // Broadcast to WebSocket clients
  messageBroker.broadcastToRoute("/api/admin/system/cron", {
    type: "status",
    cronName,
    data: { status, ...extra },
    timestamp: new Date(),
  });
}

export async function broadcastProgress(cronName: string, progress: number) {
  // Update the progress in CronJobManager
  try {
    const Manager = await getCronJobManager();
    const cronJobManager = await Manager.getInstance();
    cronJobManager.updateJobRunningStatus(cronName, "running", progress);
  } catch (error) {
    logger.error("CRON", `Failed to update cron progress for ${cronName}`, error);
  }

  // Broadcast to WebSocket clients
  messageBroker.broadcastToRoute("/api/admin/system/cron", {
    type: "progress",
    cronName,
    data: { progress },
    timestamp: new Date(),
  });
}

export function broadcastLog(
  cronName: string,
  logMessage: string,
  logType: "info" | "warning" | "error" | "success" = "info"
) {
  messageBroker.broadcastToRoute("/api/admin/system/cron", {
    type: "log",
    cronName,
    data: { message: logMessage, logType },
    timestamp: new Date(),
  });
}
