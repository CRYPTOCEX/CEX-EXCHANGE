// utils/cronBroadcast.ts
import { messageBroker } from "@b/handler/Websocket";
import CronJobManager from "@b/utils/cron";

export async function broadcastStatus(
  cronName: string,
  status: "idle" | "running" | "completed" | "failed",
  extra: Record<string, any> = {}
) {
  // Update the job status in CronJobManager
  try {
    const cronJobManager = await CronJobManager.getInstance();
    cronJobManager.updateJobRunningStatus(cronName, status);
  } catch (error) {
    console.error(`Failed to update cron job status for ${cronName}:`, error);
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
    const cronJobManager = await CronJobManager.getInstance();
    cronJobManager.updateJobRunningStatus(cronName, "running", progress);
  } catch (error) {
    console.error(`Failed to update cron job progress for ${cronName}:`, error);
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
