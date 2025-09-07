import { crudParameters } from "@b/utils/constants";
import { commonBulkDeleteResponses } from "@b/utils/query";
import { promises as fs } from "fs";
import { join } from "path";

export const metadata = {
  summary: "Completely clean all logs in the logs folder",
  operationId: "cleanAllLogs",
  tags: ["Admin", "Logs"],
  parameters: crudParameters,
  responses: commonBulkDeleteResponses("Log Entries"),
  requiresAuth: true,
  permission: "delete.system.log",
};

export default async (data: Handler) => {
  const logsDirectory = join(process.cwd(), "logs");

  await cleanAllLogs(logsDirectory);
  return { message: "All log entries deleted successfully" };
};

async function cleanAllLogs(logsDirectory: string): Promise<void> {
  const logFiles = await fs.readdir(logsDirectory);

  const deletePromises = logFiles.map((logFile) => {
    const logFilePath = join(logsDirectory, logFile);
    return fs.unlink(logFilePath);
  });

  await Promise.all(deletePromises);
}
