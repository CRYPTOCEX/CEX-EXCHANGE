// utils/cronBroadcast.ts
import { messageBroker } from "@b/handler/Websocket";

export function broadcastStatus(
  cronName: string,
  status: "idle" | "running" | "completed" | "failed",
  extra: Record<string, any> = {}
) {
  messageBroker.broadcastToRoute("/api/admin/system/cron", {
    type: "status",
    cronName,
    data: { status, ...extra },
    timestamp: new Date(),
  });
}

export function broadcastProgress(cronName: string, progress: number) {
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
