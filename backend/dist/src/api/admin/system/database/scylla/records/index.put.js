"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a ScyllaDB record",
    description: "Updates non-key columns of one existing row, addressed by its complete primary key. Refuses if the row does not exist.",
    operationId: "updateScyllaRecord",
    tags: ["Admin", "Database"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        keyspace: { type: "string" },
                        table: { type: "string" },
                        key: {
                            type: "object",
                            description: "Every partition-key and clustering column of the row",
                        },
                        values: {
                            type: "object",
                            description: "Non-key columns to set",
                        },
                    },
                    required: ["keyspace", "table", "key", "values"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Record updated",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            row: { type: "object" },
                        },
                    },
                },
            },
        },
        400: { description: "Invalid request" },
        404: { description: "Unknown table, or no row behind that primary key" },
        503: { description: "Ecosystem extension not installed, or ScyllaDB unreachable" },
        500: { description: "Internal server error" },
    },
    permission: "access.database",
    logModule: "ADMIN_SYS",
    logTitle: "ScyllaDB record update",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    try {
        const { client, keyspaces } = await (0, utils_1.getScylla)();
        const { types } = require("cassandra-driver");
        const schema = await (0, utils_1.readSchema)(client, keyspaces);
        const t = (0, utils_1.resolveTable)(schema, String(body === null || body === void 0 ? void 0 : body.keyspace), String(body === null || body === void 0 ? void 0 : body.table));
        const key = body === null || body === void 0 ? void 0 : body.key;
        const values = body === null || body === void 0 ? void 0 : body.values;
        if (!key || typeof key !== "object" || Array.isArray(key)) {
            throw (0, error_1.createError)({ statusCode: 400, message: "key must be an object" });
        }
        if (!values || typeof values !== "object" || Array.isArray(values)) {
            throw (0, error_1.createError)({ statusCode: 400, message: "values must be an object" });
        }
        const pk = [...t.partitionKey, ...t.clusteringKey];
        const missing = pk.filter((k) => key[k] === undefined || key[k] === null);
        if (missing.length) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `key must contain every primary-key column; missing: ${missing.join(", ")}`,
            });
        }
        const setCols = Object.keys(values);
        if (!setCols.length) {
            throw (0, error_1.createError)({ statusCode: 400, message: "values is empty" });
        }
        const unknown = setCols.filter((c) => !t.columns[c]);
        if (unknown.length) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Unknown column(s): ${unknown.join(", ")}`,
            });
        }
        const keyCols = setCols.filter((c) => pk.includes(c));
        if (keyCols.length) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot change primary-key column(s): ${keyCols.join(", ")}. ` +
                    `Delete the row and insert a new one instead.`,
            });
        }
        const whereCql = pk.map((k) => `"${k}" = ?`).join(" AND ");
        const whereParams = pk.map((k) => (0, utils_1.decodeValue)(key[k], t.columns[k], types));
        const existing = await client.execute(`SELECT * FROM "${t.keyspace}"."${t.table}" WHERE ${whereCql}`, whereParams, { prepare: true });
        if (!existing.rows.length) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "No row behind that primary key. An UPDATE here would create one, so it was refused.",
            });
        }
        const setParams = setCols.map((c) => values[c] === null ? null : (0, utils_1.decodeValue)(values[c], t.columns[c], types));
        await client.execute(`UPDATE "${t.keyspace}"."${t.table}" SET ${setCols
            .map((c) => `"${c}" = ?`)
            .join(", ")} WHERE ${whereCql}`, [...setParams, ...whereParams], { prepare: true });
        const after = await client.execute(`SELECT * FROM "${t.keyspace}"."${t.table}" WHERE ${whereCql}`, whereParams, { prepare: true });
        const row = {};
        if (after.rows.length) {
            for (const k of Object.keys(after.rows[0]))
                row[k] = (0, utils_1.encodeValue)(after.rows[0][k]);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Updated ${t.keyspace}.${t.table} [${pk.map((k) => `${k}=${key[k]}`).join(", ")}]: ` +
            `${setCols.join(", ")}`);
        return { message: "Record updated", row };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`ScyllaDB record update failed: ${error.message}`);
        if (error.statusCode)
            throw error;
        throw (0, error_1.createError)({ statusCode: 500, message: error.message });
    }
};
