"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const fs_1 = require("fs");
const zlib_1 = require("zlib");
const readline_1 = __importDefault(require("readline"));
const path_1 = __importDefault(require("path"));
const date_fns_1 = require("date-fns");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Lists ScyllaDB snapshots",
    description: "Returns the ScyllaDB snapshot files on disk with their row counts, size and creation time",
    operationId: "listScyllaBackups",
    tags: ["Admin", "Database"],
    requiresAuth: true,
    responses: {
        200: {
            description: "List of ScyllaDB snapshots",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                filename: { type: "string", description: "Name of the snapshot file" },
                                createdAt: { type: "string", description: "When the snapshot was taken" },
                                size: { type: "number", description: "File size in bytes" },
                                rows: { type: "number", description: "Rows in the snapshot" },
                                tables: { type: "number", description: "Base tables in the snapshot" },
                                keyspaces: {
                                    type: "array",
                                    items: { type: "string" },
                                    description: "Keyspaces the snapshot covers",
                                },
                            },
                        },
                    },
                },
            },
        },
        500: { description: "Internal server error" },
    },
    permission: "access.database",
};
async function readHead(file) {
    return new Promise((resolve) => {
        let meta = null;
        const stream = (0, fs_1.createReadStream)(file);
        const rl = readline_1.default.createInterface({ input: stream.pipe((0, zlib_1.createGunzip)()) });
        const done = (v) => {
            rl.close();
            stream.destroy();
            resolve(v);
        };
        rl.on("line", (line) => {
            try {
                const o = JSON.parse(line);
                if (o._ === "meta") {
                    meta = o;
                    done(meta);
                }
            }
            catch (_a) {
                done(null);
            }
        });
        rl.on("close", () => resolve(meta));
        stream.on("error", () => resolve(null));
        rl.on("error", () => resolve(null));
    });
}
exports.default = async (data) => {
    var _a;
    var _b, _c, _d;
    try {
        await (0, utils_1.ensureBackupDir)();
        const entries = await fs_1.promises.readdir(utils_1.scyllaBackupDir, { withFileTypes: true });
        const files = entries
            .filter((e) => e.isFile() && utils_1.SCYLLA_BACKUP_FILENAME.test(e.name))
            .map((e) => e.name)
            .sort()
            .reverse();
        const out = [];
        for (const filename of files) {
            const full = path_1.default.resolve(utils_1.scyllaBackupDir, filename);
            const stat = await fs_1.promises.stat(full);
            const meta = await readHead(full);
            const stamp = filename.slice("scylla_".length, "scylla_".length + 19);
            let createdAt;
            try {
                createdAt = (0, date_fns_1.formatDate)((0, date_fns_1.parse)(stamp, "yyyy_MM_dd_HH_mm_ss", new Date()), "yyyy-MM-dd HH:mm:ss");
            }
            catch (_e) {
                createdAt = (0, date_fns_1.formatDate)(stat.mtime, "yyyy-MM-dd HH:mm:ss");
            }
            out.push({
                filename,
                createdAt,
                size: stat.size,
                rows: null,
                tables: (_b = (_a = meta === null || meta === void 0 ? void 0 : meta.tables) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : null,
                keyspaces: (_c = meta === null || meta === void 0 ? void 0 : meta.keyspaces) !== null && _c !== void 0 ? _c : [],
                version: (_d = meta === null || meta === void 0 ? void 0 : meta.version) !== null && _d !== void 0 ? _d : null,
                readable: Boolean(meta),
            });
        }
        return out;
    }
    catch (error) {
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
};
