"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Reads ScyllaDB records",
    description: "Returns a page of rows from one ScyllaDB base table, optionally filtered by an exact partition key",
    operationId: "listScyllaRecords",
    tags: ["Admin", "Database"],
    requiresAuth: true,
    parameters: [
        {
            name: "keyspace",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Keyspace to read from",
        },
        {
            name: "table",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Base table to read from",
        },
        {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Rows per page (1-500, default 50)",
        },
        {
            name: "pageState",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Opaque page cursor returned by the previous call",
        },
        {
            name: "filter",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: 'JSON object of exact partition-key values, e.g. {"symbol":"BTC/USDT"}. Must cover every partition-key column.',
        },
    ],
    responses: {
        200: {
            description: "A page of records",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            rows: { type: "array", items: { type: "object" } },
                            pageState: { type: "string", nullable: true },
                            columns: { type: "array", items: { type: "string" } },
                            primaryKey: { type: "array", items: { type: "string" } },
                        },
                    },
                },
            },
        },
        400: { description: "Invalid request" },
        404: { description: "Unknown table" },
        503: { description: "Ecosystem extension not installed, or ScyllaDB unreachable" },
        500: { description: "Internal server error" },
    },
    permission: "access.database",
};
exports.default = async (data) => {
    var _a;
    const { query } = data;
    try {
        const { client, keyspaces } = await (0, utils_1.getScylla)();
        const { types } = require("cassandra-driver");
        const schema = await (0, utils_1.readSchema)(client, keyspaces);
        const t = (0, utils_1.resolveTable)(schema, String(query.keyspace), String(query.table));
        const rawLimit = Number(query.limit);
        const limit = Number.isInteger(rawLimit) && rawLimit >= 1 && rawLimit <= 500 ? rawLimit : 50;
        let where = "";
        const params = [];
        if (query.filter) {
            let parsed;
            try {
                parsed = JSON.parse(String(query.filter));
            }
            catch (_b) {
                throw (0, error_1.createError)({ statusCode: 400, message: "filter is not valid JSON" });
            }
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                throw (0, error_1.createError)({ statusCode: 400, message: "filter must be an object" });
            }
            const given = Object.keys(parsed);
            const unknown = given.filter((k) => !t.columns[k]);
            if (unknown.length) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Unknown column(s) in filter: ${unknown.join(", ")}`,
                });
            }
            const missing = t.partitionKey.filter((k) => !given.includes(k));
            if (missing.length) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Filtering ${t.keyspace}.${t.table} needs every partition-key column ` +
                        `(${t.partitionKey.join(", ")}); missing: ${missing.join(", ")}. ` +
                        `A partial key would require a full scan of the table.`,
                });
            }
            const allowed = new Set([...t.partitionKey, ...t.clusteringKey]);
            const nonKey = given.filter((k) => !allowed.has(k));
            if (nonKey.length) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Cannot filter on non-key column(s): ${nonKey.join(", ")}. ` +
                        `Only the primary key can be queried without scanning the table.`,
                });
            }
            const ordered = [
                ...t.partitionKey,
                ...t.clusteringKey.filter((k) => given.includes(k)),
            ].filter((k) => given.includes(k));
            where =
                " WHERE " + ordered.map((k) => `"${k}" = ?`).join(" AND ");
            for (const k of ordered)
                params.push((0, utils_1.decodeValue)(parsed[k], t.columns[k], types));
        }
        const options = { prepare: true, fetchSize: limit };
        if (query.pageState)
            options.pageState = String(query.pageState);
        const result = await client.execute(`SELECT * FROM "${t.keyspace}"."${t.table}"${where}`, params, options);
        const rows = result.rows.map((row) => {
            const o = {};
            for (const k of Object.keys(row))
                o[k] = (0, utils_1.encodeValue)(row[k]);
            return o;
        });
        return {
            rows,
            pageState: (_a = result.pageState) !== null && _a !== void 0 ? _a : null,
            columns: Object.keys(t.columns),
            primaryKey: [...t.partitionKey, ...t.clusteringKey],
            partitionKey: t.partitionKey,
            clusteringKey: t.clusteringKey,
            types: t.columns,
        };
    }
    catch (error) {
        if (error.statusCode)
            throw error;
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
};
