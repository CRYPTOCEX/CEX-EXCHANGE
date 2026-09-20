"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const fs_1 = require("fs");
const zlib_1 = require("zlib");
const path_1 = __importDefault(require("path"));
const date_fns_1 = require("date-fns");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Backs up ScyllaDB",
    description: "Writes every base-table row of the ecosystem and futures keyspaces, plus their schema, to a compressed snapshot file",
    operationId: "backupScylla",
    tags: ["Admin", "Database"],
    requiresAuth: true,
    responses: {
        200: {
            description: "ScyllaDB snapshot created successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string", description: "Success message" },
                            filename: { type: "string", description: "Name of the snapshot file" },
                            rows: { type: "number", description: "Rows written" },
                            tables: { type: "number", description: "Base tables written" },
                        },
                    },
                },
            },
        },
        503: { description: "Ecosystem extension not installed, or ScyllaDB unreachable" },
        500: { description: "Internal server error" },
    },
    permission: "access.database",
    logModule: "ADMIN_SYS",
    logTitle: "ScyllaDB backup",
};
exports.default = async (data) => {
    const { ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Connecting to ScyllaDB");
        const { client, keyspaces } = await (0, utils_1.getScylla)();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Reading schema");
        const schema = await (0, utils_1.readSchema)(client, keyspaces);
        if (!schema.length) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: `No tables found in keyspaces: ${keyspaces.join(", ")}`,
            });
        }
        await (0, utils_1.ensureBackupDir)();
        const filename = `scylla_${(0, date_fns_1.format)(new Date(), "yyyy_MM_dd_HH_mm_ss")}.ndjson.gz`;
        const target = path_1.default.resolve(utils_1.scyllaBackupDir, filename);
        const partial = `${target}.partial`;
        const gz = (0, zlib_1.createGzip)({ level: 6 });
        const out = (0, fs_1.createWriteStream)(partial);
        const finished = new Promise((resolve, reject) => {
            out.on("close", resolve);
            out.on("error", reject);
            gz.on("error", reject);
        });
        gz.pipe(out);
        const write = (obj) => gz.write(JSON.stringify(obj) + "\n")
            ? Promise.resolve()
            : new Promise((resolve) => gz.once("drain", resolve));
        try {
            await write({
                _: "meta",
                version: utils_1.BACKUP_FORMAT_VERSION,
                createdAt: new Date().toISOString(),
                keyspaces,
                tables: schema.map((t) => `${t.keyspace}.${t.table}`),
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Capturing schema definitions");
            for (const ks of keyspaces) {
                const { method, statements } = await (0, utils_1.describeKeyspace)(client, ks, schema);
                await write({ _: "ddlmeta", ks, method, count: statements.length });
                for (const s of statements)
                    await write({ _: "ddl", ...s });
            }
            let rows = 0;
            for (const t of schema) {
                ctx === null || ctx === void 0 ? void 0 : ctx.step(`Exporting ${t.keyspace}.${t.table}`);
                let n = 0;
                await new Promise((resolve, reject) => {
                    client.eachRow(`SELECT * FROM "${t.keyspace}"."${t.table}"`, [], { prepare: true, fetchSize: 1000, autoPage: true }, (_i, row) => {
                        const d = {};
                        for (const k of Object.keys(row))
                            d[k] = (0, utils_1.encodeValue)(row[k]);
                        n++;
                        gz.write(JSON.stringify({ _: "row", ks: t.keyspace, t: t.table, d }) + "\n");
                    }, (err) => (err ? reject(err) : resolve()));
                });
                rows += n;
                await write({ _: "count", ks: t.keyspace, t: t.table, rows: n });
            }
            await write({ _: "end", rows, tables: schema.length });
            gz.end();
            await finished;
            await fs_1.promises.rename(partial, target);
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Pruning old snapshots");
            const pruned = await (0, utils_1.pruneOldBackups)();
            const size = (await fs_1.promises.stat(target)).size;
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`ScyllaDB snapshot created: ${filename} (${rows} rows from ${schema.length} tables, ` +
                `${(size / 1024).toFixed(0)} KiB)` +
                (pruned ? ` — pruned ${pruned} older snapshot${pruned === 1 ? "" : "s"}` : ""));
            return {
                message: "ScyllaDB snapshot created successfully",
                filename,
                rows,
                tables: schema.length,
            };
        }
        catch (error) {
            gz.destroy();
            out.destroy();
            await fs_1.promises.unlink(partial).catch(() => { });
            throw error;
        }
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`ScyllaDB backup failed: ${error.message}`);
        if (error.statusCode)
            throw error;
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
};
