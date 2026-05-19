"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const promises_1 = require("fs/promises");
const error_1 = require("@b/utils/error");
const path_1 = __importDefault(require("path"));
const date_fns_1 = require("date-fns");
exports.metadata = {
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
const backupDir = path_1.default.resolve(process.cwd(), "backup");
const parseDateFromFilename = (filename) => {
    const dateString = filename.split(".")[0];
    return (0, date_fns_1.parse)(dateString, "yyyy_MM_dd_HH_mm_ss", new Date());
};
const listDatabaseBackups = async () => {
    try {
        await (0, promises_1.mkdir)(backupDir, { recursive: true });
        const files = await (0, promises_1.readdir)(backupDir, { withFileTypes: true });
        const backups = files
            .filter((file) => file.isFile() && file.name.endsWith(".sql"))
            .map((file) => {
            const createdAt = parseDateFromFilename(file.name);
            return {
                filename: file.name,
                path: `/backup/${file.name}`,
                createdAt: (0, date_fns_1.formatDate)(createdAt, "yyyy-MM-dd HH:mm:ss"),
            };
        });
        return backups;
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message,
        });
    }
};
exports.default = async (data) => {
    try {
        const backups = await listDatabaseBackups();
        return backups;
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message,
        });
    }
};
