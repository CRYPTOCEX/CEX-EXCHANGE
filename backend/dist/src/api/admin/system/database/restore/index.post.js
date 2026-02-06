"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const promise_1 = require("mysql2/promise");
const validation_1 = require("@b/utils/validation");
const console_1 = require("@b/utils/console");
exports.metadata = {
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
    logModule: "ADMIN_SYS",
    logTitle: "Database restore",
};
const checkEnvVariables = () => {
    const requiredEnvVars = ["DB_HOST", "DB_USER", "DB_NAME"];
    requiredEnvVars.forEach((varName) => {
        if (!process.env[varName]) {
            throw (0, error_1.createError)({ statusCode: 500, message: `Environment variable ${varName} is not set` });
        }
    });
};
const getDbConnection = async () => {
    const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    if (!DB_HOST || !DB_USER || !DB_NAME) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Database configuration is incomplete" });
    }
    const connection = await (0, promise_1.createConnection)({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD || "",
        database: DB_NAME,
        multipleStatements: true,
        connectTimeout: 10000,
    });
    await connection.query("SET GLOBAL max_allowed_packet = 67108864");
    return connection;
};
const executeSqlStatements = async (connection, sqlStatements) => {
    for (const statement of sqlStatements) {
        try {
            await connection.query(statement);
        }
        catch (error) {
            if (error.code === "ECONNRESET") {
                console_1.logger.error("DATABASE", "Connection was reset. Retrying...", error);
                await new Promise((resolve) => setTimeout(resolve, 5000));
                await executeSqlStatements(connection, [statement]);
            }
            else {
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
exports.default = async (data) => {
    const { ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating database configuration");
        checkEnvVariables();
        const { backupFile } = data.body;
        const { DB_NAME } = process.env;
        if (!backupFile) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Backup file path is required" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating backup file");
        const sanitizedBackupFile = (0, validation_1.sanitizePath)(backupFile);
        const backupPath = path_1.default.resolve(process.cwd(), "backup", sanitizedBackupFile);
        await fs_1.promises.access(backupPath);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Reading backup file");
        const sql = await fs_1.promises.readFile(backupPath, "utf8");
        const sqlStatements = splitSqlFile(sql);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Connecting to database");
        const connection = await getDbConnection();
        try {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Dropping and recreating database");
            await dropAndRecreateDatabase(connection, DB_NAME);
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Executing ${sqlStatements.length} SQL statements`);
            await executeSqlStatements(connection, sqlStatements);
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Database restored successfully");
            return {
                message: "Database restored successfully",
            };
        }
        finally {
            await connection.end();
        }
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Database restore failed: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error restoring database: ${error.message}`,
        });
    }
};
