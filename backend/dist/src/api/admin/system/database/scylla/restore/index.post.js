"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const fs_1 = require("fs");
const fs_2 = require("fs");
const zlib_1 = require("zlib");
const readline_1 = __importDefault(require("readline"));
const path_1 = __importDefault(require("path"));
const validation_1 = require("@b/utils/validation");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Restores ScyllaDB from a snapshot",
    description: "Replays a ScyllaDB snapshot. In merge mode rows are upserted over existing data; in replace mode each table in the snapshot is truncated first.",
    operationId: "restoreScylla",
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
                            description: "Snapshot file to restore from",
                        },
                        mode: {
                            type: "string",
                            enum: ["merge", "replace"],
                            description: "merge upserts rows and deletes nothing; replace truncates each table in the snapshot first",
                        },
                        createMissingSchema: {
                            type: "boolean",
                            description: "Apply the snapshot's CREATE statements for keyspaces and tables that do not exist",
                        },
                        tables: {
                            type: "array",
                            items: { type: "string" },
                            description: "Restrict the restore to these keyspace.table names; omit for every table in the snapshot",
                        },
                    },
                    required: ["backupFile"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "ScyllaDB restored",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            rows: { type: "number" },
                            tables: { type: "number" },
                            skipped: { type: "number" },
                            warnings: { type: "array", items: { type: "string" } },
                        },
                    },
                },
            },
        },
        400: { description: "Invalid request" },
        503: { description: "Ecosystem extension not installed, or ScyllaDB unreachable" },
        500: { description: "Internal server error" },
    },
    permission: "access.database",
    logModule: "ADMIN_SYS",
    logTitle: "ScyllaDB restore",
};
const WRITE_CONCURRENCY = 24;
exports.default = async (data) => {
    var _a;
    const { body, ctx } = data;
    try {
        const filename = (0, utils_1.assertBackupFilename)(body === null || body === void 0 ? void 0 : body.backupFile);
        const mode = (body === null || body === void 0 ? void 0 : body.mode) === "replace" ? "replace" : "merge";
        const createMissingSchema = Boolean(body === null || body === void 0 ? void 0 : body.createMissingSchema);
        const only = Array.isArray(body === null || body === void 0 ? void 0 : body.tables) && body.tables.length
            ? body.tables.map(String)
            : null;
        const target = path_1.default.resolve(utils_1.scyllaBackupDir, filename);
        if (!(0, validation_1.validatePathSecurity)(target, utils_1.scyllaBackupDir)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Path escapes backup directory",
            });
        }
        try {
            await fs_2.promises.access(target);
        }
        catch (_b) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Snapshot not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Connecting to ScyllaDB");
        const { client, keyspaces } = await (0, utils_1.getScylla)();
        const { types } = require("cassandra-driver");
        const warnings = [];
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Reading snapshot header");
        const ddl = [];
        const snapshotTables = new Set();
        let meta = null;
        await new Promise((resolve, reject) => {
            const stream = (0, fs_1.createReadStream)(target);
            const rl = readline_1.default.createInterface({ input: stream.pipe((0, zlib_1.createGunzip)()) });
            rl.on("line", (line) => {
                if (!line)
                    return;
                let o;
                try {
                    o = JSON.parse(line);
                }
                catch (_a) {
                    return;
                }
                if (o._ === "meta")
                    meta = o;
                else if (o._ === "ddl")
                    ddl.push(o);
                else if (o._ === "row")
                    snapshotTables.add(`${o.ks}.${o.t}`);
                else if (o._ === "ddlmeta" && o.method === "system_schema") {
                    warnings.push(`Schema for ${o.ks} was captured from system_schema, not DESCRIBE — ` +
                        `table options such as compaction and compression are not in this snapshot.`);
                }
            });
            rl.on("close", resolve);
            stream.on("error", reject);
            rl.on("error", reject);
        });
        if (!meta) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Snapshot is unreadable or not a ScyllaDB snapshot file",
            });
        }
        if (createMissingSchema && ddl.length) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating missing schema");
            const rank = { keyspace: 0, type: 1, table: 2, index: 3, view: 4 };
            const sorted = ddl.slice().sort((a, b) => { var _a, _b; return ((_a = rank[a.type]) !== null && _a !== void 0 ? _a : 9) - ((_b = rank[b.type]) !== null && _b !== void 0 ? _b : 9); });
            for (const d of sorted) {
                const cql = String(d.cql || "").trim().replace(/;$/, "");
                if (!cql)
                    continue;
                try {
                    await client.execute(cql);
                }
                catch (e) {
                    if (!/already exist/i.test(String(e === null || e === void 0 ? void 0 : e.message))) {
                        warnings.push(`Schema ${d.type} ${d.name}: ${e.message}`);
                    }
                }
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Reading live schema");
        const liveKeyspaces = Array.from(new Set([...((_a = meta.keyspaces) !== null && _a !== void 0 ? _a : []), ...keyspaces]));
        const schema = await (0, utils_1.readSchema)(client, liveKeyspaces);
        const metaByName = new Map(schema.map((t) => [`${t.keyspace}.${t.table}`, t]));
        const wanted = Array.from(snapshotTables).filter((n) => !only || only.includes(n));
        const restorable = wanted.filter((n) => metaByName.has(n));
        for (const n of wanted) {
            if (!metaByName.has(n)) {
                warnings.push(`${n} is in the snapshot but does not exist on the cluster — skipped. ` +
                    `Re-run with createMissingSchema to create it.`);
            }
        }
        if (!restorable.length) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Nothing to restore: no table in the snapshot exists on the cluster",
            });
        }
        if (mode === "replace") {
            for (const name of restorable) {
                const t = metaByName.get(name);
                ctx === null || ctx === void 0 ? void 0 : ctx.step(`Truncating ${name}`);
                await client.execute(`TRUNCATE "${t.keyspace}"."${t.table}"`);
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Restoring ${restorable.length} tables (${mode} mode)`);
        const restorableSet = new Set(restorable);
        let rows = 0;
        let skipped = 0;
        const stmtCache = new Map();
        let inFlight = [];
        const flush = async () => {
            if (!inFlight.length)
                return;
            await Promise.all(inFlight);
            inFlight = [];
        };
        await new Promise((resolve, reject) => {
            const stream = (0, fs_1.createReadStream)(target);
            const rl = readline_1.default.createInterface({ input: stream.pipe((0, zlib_1.createGunzip)()) });
            let failure = null;
            rl.on("line", (line) => {
                if (failure || !line)
                    return;
                let o;
                try {
                    o = JSON.parse(line);
                }
                catch (_a) {
                    return;
                }
                if (o._ !== "row")
                    return;
                const name = `${o.ks}.${o.t}`;
                if (!restorableSet.has(name))
                    return;
                const t = metaByName.get(name);
                const cols = Object.keys(o.d).filter((k) => o.d[k] !== null && t.columns[k] !== undefined);
                if (!cols.length) {
                    skipped++;
                    return;
                }
                const pk = [...t.partitionKey, ...t.clusteringKey];
                if (pk.some((k) => !cols.includes(k))) {
                    skipped++;
                    return;
                }
                const key = `${name}|${cols.join(",")}`;
                if (!stmtCache.has(key)) {
                    stmtCache.set(key, `INSERT INTO "${t.keyspace}"."${t.table}" (${cols
                        .map((c) => `"${c}"`)
                        .join(",")}) VALUES (${cols.map(() => "?").join(",")})`);
                }
                let params;
                try {
                    params = cols.map((k) => (0, utils_1.decodeValue)(o.d[k], t.columns[k], types));
                }
                catch (e) {
                    skipped++;
                    return;
                }
                rows++;
                inFlight.push(client
                    .execute(stmtCache.get(key), params, { prepare: true })
                    .catch((e) => {
                    failure = e;
                }));
                if (inFlight.length >= WRITE_CONCURRENCY) {
                    rl.pause();
                    flush()
                        .then(() => {
                        if (failure) {
                            rl.close();
                            stream.destroy();
                            reject(failure);
                        }
                        else {
                            rl.resume();
                        }
                    })
                        .catch((e) => {
                        rl.close();
                        stream.destroy();
                        reject(e);
                    });
                }
            });
            rl.on("close", () => {
                flush()
                    .then(() => (failure ? reject(failure) : resolve()))
                    .catch(reject);
            });
            stream.on("error", reject);
            rl.on("error", reject);
        });
        const touchesEngine = restorable.some((n) => /\.(orderbook|orders|open_orders_by_market|stop_orders)$/.test(n));
        if (touchesEngine) {
            warnings.push("This restore changed order or orderbook tables. The matching engine holds " +
                "the book in memory — restart the backend before trading resumes, or it " +
                "will keep serving and writing back the book it had before.");
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`ScyllaDB restored from ${filename}: ${rows} rows into ${restorable.length} tables (${mode} mode)` +
            (skipped ? `, ${skipped} rows skipped` : ""));
        return {
            message: "ScyllaDB restored successfully",
            rows,
            tables: restorable.length,
            skipped,
            warnings,
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`ScyllaDB restore failed: ${error.message}`);
        if (error.statusCode)
            throw error;
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error restoring ScyllaDB: ${error.message}`,
        });
    }
};
