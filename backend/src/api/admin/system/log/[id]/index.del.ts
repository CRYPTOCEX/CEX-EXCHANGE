import { crudParameters } from "@b/utils/constants";
import { createError } from "@b/utils/error";
import { deleteRecordResponses } from "@b/utils/query";
import { promises as fs } from "fs";
import { join } from "path";
import { sanitizePath } from "@b/utils/validation";

export const metadata = {
  summary: "Deletes a specific log entry based on its ID",
  operationId: "deleteLogEntry",
  tags: ["Admin", "Logs"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the log entry to delete",
      required: true,
      schema: {
        type: "string",
      },
    },
    ...crudParameters,
  ],
  responses: deleteRecordResponses("Log Entry"),
  requiresAuth: true,
  permission: "delete.system.log",
};

export default async (data: Handler) => {
  const { params, query } = data;
  const filter = query.filter ? JSON.parse(query.filter) : {};
  const date = filter.date || new Date().toISOString().split("T")[0];
  delete filter.date;

  const { id } = params;
  const page = query.page ? parseInt(query.page) : 1;
  const perPage = query.perPage ? parseInt(query.perPage) : 10;

  // Sanitize the log file path to prevent LFI
  const sanitizedDate = sanitizePath(date);
  const logFilePath = join(process.cwd(), "logs", `${sanitizedDate}.log`);

  await deleteLogEntry(logFilePath, page, parseInt(id), perPage);
  return { message: "Log entry deleted successfully" };
};

export async function deleteLogEntry(
  filePath: string,
  page: number,
  pageIndex: number,
  perPage: number
): Promise<void> {
  const data = await fs.readFile(filePath, { encoding: "utf8" });
  const logs = data.split("\n").filter((line) => line.trim());

  // Calculate the actual index in the original file
  const actualIndex = (page - 1) * perPage + pageIndex;

  if (actualIndex >= logs.length) {
    throw createError(404, "Log entry not found");
  }

  // Remove the log entry by actual index
  logs.splice(actualIndex, 1);

  // Rewrite the file without the deleted entry
  const updatedContent = logs.join("\n");
  await fs.writeFile(filePath, updatedContent, { encoding: "utf8" });
}
