// file: backend/api/admin/system/database/restore/index.post.ts
import { createError } from "@b/utils/error";
import { promises as fs } from "fs";
import path from "path";
import { createConnection } from "mysql2/promise";
import { sanitizePath } from "@b/utils/validation";

export const metadata = {
  summary: "Restores the database from a backup file",
  description: "Restores the database from a specified backup file",
  operationId: "restoreDatabase",
  tags: ["Admin", "Database"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            backupFile: {
              type: "string",
              description: "Path to the backup file",
            },
          },
          required: ["backupFile"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Database restored successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
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

const getDbConnection = async () => {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error("Database configuration is incomplete");
  }

  const connection = await createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD || "", // Use an empty string if the password is not set
    database: DB_NAME,
    multipleStatements: true, // This allows executing multiple SQL statements at once
    connectTimeout: 10000, // 10 seconds
  });

  // Set max_allowed_packet size to 64MB
  await connection.query("SET GLOBAL max_allowed_packet = 67108864");

  return connection;
};

const executeSqlStatements = async (connection, sqlStatements) => {
  for (const statement of sqlStatements) {
    try {
      await connection.query(statement);
    } catch (error) {
      if (error.code === "ECONNRESET") {
        console.error("Connection was reset. Retrying...", error);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
        await executeSqlStatements(connection, [statement]); // Retry the failed statement
      } else {
        throw error;
      }
    }
  }
};

const splitSqlFile = (sql) => {
  const statements = sql.split(/;\s*$/m);
  return statements
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
};

const dropAndRecreateDatabase = async (connection, dbName) => {
  await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await connection.query(`CREATE DATABASE \`${dbName}\``);
  await connection.query(`USE \`${dbName}\``);
};

export default async (data: Handler) => {
  try {
    checkEnvVariables();
    const { backupFile } = data.body;
    const { DB_NAME } = process.env;

    if (!backupFile) {
      throw new Error("Backup file path is required");
    }

    // Sanitize the backup file path to prevent LFI
    const sanitizedBackupFile = sanitizePath(backupFile);
    const backupPath = path.resolve(
      process.cwd(),
      "backup",
      sanitizedBackupFile
    );

    // Ensure the backup file exists
    await fs.access(backupPath);

    const sql = await fs.readFile(backupPath, "utf8");
    const sqlStatements = splitSqlFile(sql);
    const connection = await getDbConnection();

    try {
      await dropAndRecreateDatabase(connection, DB_NAME);
      await executeSqlStatements(connection, sqlStatements);
      return {
        message: "Database restored successfully",
      };
    } finally {
      await connection.end();
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Error restoring database: ${error.message}`,
    });
  }
};
