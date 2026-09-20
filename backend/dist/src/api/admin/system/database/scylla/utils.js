"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BACKUP_FORMAT_VERSION = exports.SCYLLA_BACKUP_FILENAME = exports.scyllaBackupDir = void 0;
exports.getScylla = getScylla;
exports.encodeValue = encodeValue;
exports.decodeValue = decodeValue;
exports.readSchema = readSchema;
exports.describeKeyspace = describeKeyspace;
exports.assertIdentifier = assertIdentifier;
exports.resolveTable = resolveTable;
exports.assertBackupFilename = assertBackupFilename;
exports.ensureBackupDir = ensureBackupDir;
exports.resolveRetention = resolveRetention;
exports.pruneOldBackups = pruneOldBackups;
const error_1 = require("@b/utils/error");
const safe_imports_1 = require("@b/utils/safe-imports");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
exports.scyllaBackupDir = path_1.default.resolve(process.cwd(), "backup", "scylla");
exports.SCYLLA_BACKUP_FILENAME = /^scylla_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}\.ndjson\.gz$/;
exports.BACKUP_FORMAT_VERSION = 1;
async function getScylla() {
    var _a;
    const mod = await (0, safe_imports_1.getEcosystemScyllaClient)();
    if (!mod || !mod.default) {
        throw (0, error_1.createError)({
            statusCode: 503,
            message: "ScyllaDB tooling requires the Ecosystem extension, which is not installed on this server.",
        });
    }
    try {
        await mod.initialize();
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 503,
            message: `ScyllaDB is not reachable: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`,
        });
    }
    const keyspaces = Array.from(new Set([mod.scyllaKeyspace, mod.scyllaFuturesKeyspace].filter(Boolean)));
    return { client: mod.default, keyspaces };
}
function encodeValue(v) {
    if (v === null || v === undefined)
        return null;
    const ctor = v.constructor && v.constructor.name;
    if (ctor === "Integer" ||
        ctor === "BigDecimal" ||
        ctor === "Uuid" ||
        ctor === "TimeUuid" ||
        ctor === "LocalDate" ||
        ctor === "LocalTime" ||
        ctor === "Long" ||
        ctor === "InetAddress") {
        return v.toString();
    }
    if (v instanceof Date)
        return v.toISOString();
    if (Buffer.isBuffer(v))
        return v.toString("base64");
    if (typeof v === "bigint")
        return v.toString();
    return v;
}
function decodeValue(val, cqlType, types) {
    if (val === null || val === undefined)
        return null;
    const t = String(cqlType || "").toLowerCase();
    switch (t) {
        case "varint":
            return types.Integer.fromString(String(val));
        case "decimal":
            return types.BigDecimal.fromString(String(val));
        case "uuid":
            return types.Uuid.fromString(String(val));
        case "timeuuid":
            return types.TimeUuid.fromString(String(val));
        case "date":
            return types.LocalDate.fromString(String(val));
        case "time":
            return types.LocalTime.fromString(String(val));
        case "timestamp":
            return new Date(val);
        case "blob":
            return Buffer.from(String(val), "base64");
        case "double":
        case "float":
        case "int":
        case "smallint":
        case "tinyint":
            return Number(val);
        case "bigint":
        case "counter":
            return types.Long.fromString(String(val));
        case "boolean":
            return typeof val === "boolean" ? val : String(val) === "true";
        default:
            return val;
    }
}
async function readSchema(client, keyspaces) {
    const out = [];
    for (const ks of keyspaces) {
        const tables = await client.execute("SELECT table_name FROM system_schema.tables WHERE keyspace_name = ?", [ks], { prepare: true });
        const cols = await client.execute("SELECT table_name, column_name, type, kind, position FROM system_schema.columns WHERE keyspace_name = ?", [ks], { prepare: true });
        for (const t of tables.rows) {
            const mine = cols.rows.filter((c) => c.table_name === t.table_name);
            if (!mine.length)
                continue;
            const columns = {};
            for (const c of mine)
                columns[c.column_name] = c.type;
            out.push({
                keyspace: ks,
                table: t.table_name,
                columns,
                partitionKey: mine
                    .filter((c) => c.kind === "partition_key")
                    .sort((a, b) => a.position - b.position)
                    .map((c) => c.column_name),
                clusteringKey: mine
                    .filter((c) => c.kind === "clustering")
                    .sort((a, b) => a.position - b.position)
                    .map((c) => c.column_name),
            });
        }
    }
    return out;
}
async function describeKeyspace(client, ks, tables) {
    try {
        const res = await client.execute(`DESCRIBE KEYSPACE ${ks}`);
        if (res.rows && res.rows.length) {
            return {
                method: "describe",
                statements: res.rows.map((r) => ({
                    ks: r.keyspace_name,
                    type: r.type,
                    name: r.name,
                    cql: r.create_statement,
                })),
            };
        }
    }
    catch (_a) {
    }
    const stmts = [];
    const ksRow = await client.execute("SELECT replication, durable_writes FROM system_schema.keyspaces WHERE keyspace_name = ?", [ks], { prepare: true });
    if (ksRow.rows.length) {
        const rep = ksRow.rows[0].replication || {};
        const repCql = Object.keys(rep)
            .map((k) => `'${k}': '${rep[k]}'`)
            .join(", ");
        stmts.push({
            ks,
            type: "keyspace",
            name: ks,
            cql: `CREATE KEYSPACE ${ks} WITH replication = {${repCql}} AND durable_writes = ${ksRow.rows[0].durable_writes};`,
        });
    }
    const orders = await client.execute("SELECT table_name, column_name, clustering_order FROM system_schema.columns WHERE keyspace_name = ?", [ks], { prepare: true });
    for (const t of tables.filter((x) => x.keyspace === ks)) {
        const colDefs = Object.keys(t.columns)
            .map((c) => `  "${c}" ${t.columns[c]}`)
            .join(",\n");
        const pk = `(${t.partitionKey.map((c) => `"${c}"`).join(", ")})` +
            (t.clusteringKey.length
                ? `, ${t.clusteringKey.map((c) => `"${c}"`).join(", ")}`
                : "");
        let cql = `CREATE TABLE ${ks}."${t.table}" (\n${colDefs},\n  PRIMARY KEY (${pk})\n)`;
        if (t.clusteringKey.length) {
            const dirs = t.clusteringKey.map((c) => {
                const row = orders.rows.find((o) => o.table_name === t.table && o.column_name === c);
                return `"${c}" ${String((row === null || row === void 0 ? void 0 : row.clustering_order) || "asc").toUpperCase()}`;
            });
            cql += ` WITH CLUSTERING ORDER BY (${dirs.join(", ")})`;
        }
        stmts.push({ ks, type: "table", name: t.table, cql: cql + ";" });
    }
    return { method: "system_schema", statements: stmts };
}
function assertIdentifier(name, what) {
    if (typeof name !== "string" || !/^[A-Za-z0-9_]{1,48}$/.test(name)) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Invalid ${what}` });
    }
    return name;
}
function resolveTable(schema, keyspace, table) {
    assertIdentifier(keyspace, "keyspace");
    assertIdentifier(table, "table");
    const found = schema.find((t) => t.keyspace === keyspace && t.table === table);
    if (!found) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: `Unknown table ${keyspace}.${table}`,
        });
    }
    return found;
}
function assertBackupFilename(filename) {
    if (typeof filename !== "string" || !exports.SCYLLA_BACKUP_FILENAME.test(filename)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid backup file name" });
    }
    return filename;
}
async function ensureBackupDir() {
    await fs_1.promises.mkdir(exports.scyllaBackupDir, { recursive: true });
}
function resolveRetention(raw) {
    const text = String(raw !== null && raw !== void 0 ? raw : "").trim();
    if (!/^\d+$/.test(text))
        return 10;
    const n = Number(text);
    return Number.isInteger(n) && n >= 1 ? n : 10;
}
async function pruneOldBackups() {
    const retain = resolveRetention(process.env.SCYLLA_BACKUP_RETAIN);
    const entries = await fs_1.promises.readdir(exports.scyllaBackupDir);
    const ours = entries.filter((f) => exports.SCYLLA_BACKUP_FILENAME.test(f)).sort();
    const doomed = ours.slice(0, Math.max(0, ours.length - retain));
    for (const f of doomed) {
        try {
            await fs_1.promises.unlink(path_1.default.resolve(exports.scyllaBackupDir, f));
        }
        catch (_a) {
        }
    }
    return doomed.length;
}
