// file: backend/api/admin/system/database/backup/index.post.ts
import { createError } from "@b/utils/error";
import { promises as fs } from "fs";
import path from "path";
import mysqldump from "mysqldump";
import { format } from "date-fns";

export const metadata = {
  summary: "Backs up the database",
  description: "Creates a backup of the entire database",
  operationId: "backupDatabase",
  tags: ["Admin", "Database"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Database backup created successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
              backupFile: {
                type: "string",
                description: "Path to the backup file",
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

const checkEnvVariables = () => {
  const requiredEnvVars = ["DB_HOST", "DB_USER", "DB_NAME"];
  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      throw new Error(`Environment variable ${varName} is not set`);
    }
  });
};

const getDbConnection = () => {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error("Database configuration is incomplete");
  }

  return {
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD || "", // Use an empty string if the password is not set
    database: DB_NAME,
  };
};

export default async (data: Handler) => {
  try {
    checkEnvVariables();
    const connection = getDbConnection();

    const backupDir = path.resolve(process.cwd(), "backup");
    const backupFileName = `${format(new Date(), "yyyy_MM_dd_HH_mm_ss")}.sql`;
    const backupPath = path.resolve(backupDir, backupFileName);

    // Ensure the backup directory exists
    await fs.mkdir(backupDir, { recursive: true });

    await mysqldump({
      connection,
      dumpToFile: backupPath,
    });

    return {
      message: "Database backup created successfully",
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error.message,
    });
  }
};
