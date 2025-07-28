// file: backend/api/admin/system/database/backup/index.get.ts
import { readdir, mkdir } from "fs/promises";
import { createError } from "@b/utils/error";
import path from "path";
import { parse, formatDate } from "date-fns";

export const metadata = {
  summary: "Lists database backups",
  description: "Returns a list of database backups with their details",
  operationId: "listDatabaseBackups",
  tags: ["Admin", "Database"],
  requiresAuth: true,
  responses: {
    200: {
      description: "List of database backups",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                filename: {
                  type: "string",
                  description: "Name of the backup file",
                },
                path: {
                  type: "string",
                  description: "Path to the backup file",
                },
                createdAt: {
                  type: "string",
                  format: "date-time",
                  description: "Timestamp of when the backup was created",
                },
              },
            },
          },
        },
      },
    },
    500: {
      description: "Internal server error",
    },
  },
  permission: "access.database",
};

const backupDir = path.resolve(process.cwd(), "backup");

const parseDateFromFilename = (filename: string): Date => {
  const dateString = filename.split(".")[0];
  return parse(dateString, "yyyy_MM_dd_HH_mm_ss", new Date());
};

const listDatabaseBackups = async () => {
  try {
    // Ensure the backup directory exists
    await mkdir(backupDir, { recursive: true });

    const files = await readdir(backupDir, { withFileTypes: true });
    const backups = files
      .filter((file) => file.isFile() && file.name.endsWith(".sql"))
      .map((file) => {
        const createdAt = parseDateFromFilename(file.name);
        return {
          filename: file.name,
          path: `/backup/${file.name}`, // Adjust the path format
          createdAt: formatDate(createdAt, "yyyy-MM-dd HH:mm:ss"),
        };
      });

    return backups;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error.message,
    });
  }
};

export default async (data: Handler) => {
  try {
    const backups = await listDatabaseBackups();
    return backups;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error.message,
    });
  }
};
