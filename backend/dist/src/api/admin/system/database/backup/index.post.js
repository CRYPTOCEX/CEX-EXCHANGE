"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const mysqldump_1 = __importDefault(require("mysqldump"));
const date_fns_1 = require("date-fns");
const db_port_1 = require("../db-port");
exports.metadata = {
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
    logModule: "ADMIN_SYS",
    logTitle: "Database backup",
};
const checkEnvVariables = () => {
    const requiredEnvVars = ["DB_HOST", "DB_USER", "DB_NAME"];
    requiredEnvVars.forEach((varName) => {
        if (!process.env[varName]) {
            throw (0, error_1.createError)({ statusCode: 500, message: `Environment variable ${varName} is not set` });
        }
    });
};
const getDbConnection = () => {
    const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;
    if (!DB_HOST || !DB_USER || !DB_NAME) {
        throw (0, error_1.createError)({ statusCode: 500, message: "Database configuration is incomplete" });
    }
    return {
        host: DB_HOST,
        port: (0, db_port_1.resolveDatabasePort)(DB_PORT),
        user: DB_USER,
        password: DB_PASSWORD || "",
        database: DB_NAME,
    };
};
const BACKUP_RETAIN = resolveBackupRetention(process.env.DB_BACKUP_RETAIN);
function resolveBackupRetention(raw) {
    const text = String(raw !== null && raw !== void 0 ? raw : "").trim();
    if (!/^\d+$/.test(text))
        return 10;
    const n = Number(text);
    return Number.isInteger(n) && n >= 1 ? n : 10;
}
const BACKUP_FILENAME = /^\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}\.sql$/;
async function pruneOldBackups(backupDir) {
    const entries = await fs_1.promises.readdir(backupDir);
    const ours = entries.filter((f) => BACKUP_FILENAME.test(f)).sort();
    const doomed = ours.slice(0, Math.max(0, ours.length - BACKUP_RETAIN));
    for (const f of doomed) {
        try {
            await fs_1.promises.unlink(path_1.default.resolve(backupDir, f));
        }
        catch (_a) {
        }
    }
    return doomed.length;
}
exports.default = async (data) => {
    const { ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating database configuration");
        checkEnvVariables();
        const connection = getDbConnection();
        const backupDir = path_1.default.resolve(process.cwd(), "backup");
        const backupFileName = `${(0, date_fns_1.format)(new Date(), "yyyy_MM_dd_HH_mm_ss")}.sql`;
        const backupPath = path_1.default.resolve(backupDir, backupFileName);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating backup directory");
        await fs_1.promises.mkdir(backupDir, { recursive: true });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Dumping database to file");
        await (0, mysqldump_1.default)({
            connection,
            dumpToFile: backupPath,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Pruning old backups");
        const pruned = await pruneOldBackups(backupDir);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Database backup created: ${backupFileName}` +
            (pruned ? ` (pruned ${pruned} older backup${pruned === 1 ? "" : "s"})` : ""));
        return {
            message: "Database backup created successfully",
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Database backup failed: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message,
        });
    }
};
